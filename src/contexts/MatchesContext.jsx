import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from './TournamentContext';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, onSnapshot, getDocs, doc, query, where, writeBatch, setDoc } from 'firebase/firestore';

const MatchesContext = createContext(null);

const BASE_KEY = 'brazilian_v14_GLOBAL_STATE';

export const MatchesProvider = ({ children }) => {
    const [matches, setMatches] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const { isAuthenticated } = useAuth();
    const { activeTournamentId } = useTournament();

    const lsKey = activeTournamentId ? `${BASE_KEY}_${activeTournamentId}` : null;

    // --- MAPPERS (Kept for consistency, simplified where possible) ---
    const mapToCamel = (m) => {
        let mp = m.micro_points || [];
        if (typeof mp === 'string') {
            try { mp = JSON.parse(mp); } catch (e) { mp = []; }
        }

        return {
            id: m.id,
            tournamentId: m.tournament_id,
            bracket: m.bracket_type,
            round: m.round_id,
            player1Id: m.player1_id,
            player2Id: m.player2_id,
            score1: m.score1,
            score2: m.score2,
            microPoints: mp,
            winnerId: m.winner_id,
            status: m.status,
            court: m.court,
            manualOrder: m.manual_order,
            finishedAt: m.finished_at
        };
    };

    const mapToSnake = (m) => ({
        id: m.id,
        tournament_id: activeTournamentId,
        bracket_type: m.bracket || 'wb',
        round_id: m.round || 1,
        player1_id: m.player1Id || null,
        player2_id: m.player2Id || null,
        score1: m.score1 ?? null,
        score2: m.score2 ?? null,
        micro_points: JSON.stringify(m.microPoints || []),
        winner_id: m.winnerId || null,
        status: m.status || 'pending',
        court: m.court || "",
        manual_order: m.manualOrder !== undefined ? m.manualOrder : null,
        finished_at: m.finishedAt || null
    });

    // Ref to track saving state to prevent snapshot racing/echoes
    const isSavingRef = useRef(false);

    // --- DATA LOADING ---
    useEffect(() => {
        if (!activeTournamentId) {
            setMatches([]);
            return;
        }

        let unsubscribe;

        const fetchMatches = async () => {
            if (isFirebaseConfigured) {
                console.log(`[MatchesContext] Subscribing to tournament: ${activeTournamentId}`);
                const q = query(collection(db, "matches"), where("tournament_id", "==", activeTournamentId));

                unsubscribe = onSnapshot(q, (snapshot) => {
                    // Block snapshot updates if we are in the middle of a save operation
                    if (isSavingRef.current) {
                        return;
                    }

                    const loaded = snapshot.docs.map(doc => {
                        return { ...doc.data(), id: doc.id };
                    })
                        .filter(m => m.id)
                        .map(mapToCamel);

                    const uniqueMap = new Map();
                    loaded.forEach(m => uniqueMap.set(m.id, m));

                    setMatches(Array.from(uniqueMap.values()));
                }, (error) => {
                    console.error("[MatchesContext] Firebase Error:", error);
                });
            } else {
                // LocalStorage Fallback
                try {
                    const saved = localStorage.getItem(lsKey);
                    if (saved) {
                        setMatches(JSON.parse(saved));
                    }
                } catch (e) {
                    console.error("LS Load Error", e);
                }
            }
        };

        fetchMatches();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [activeTournamentId, lsKey]);

    const matchesRef = useRef(matches);
    useEffect(() => {
        matchesRef.current = matches;
    }, [matches]);

    // --- ACTIONS ---

    const saveMatches = useCallback(async (newMatches, specificMatchId = null) => {
        if (!activeTournamentId) {
            console.error("No active tournament ID, cannot save!");
            return;
        }

        console.log(`[MatchesContext] Saving ${newMatches.length} matches. Config: FB=${isFirebaseConfigured}, Auth=${isAuthenticated}, ID=${activeTournamentId}`);

        // 0. CAPTURE CURRENT STATE BEFORE ASYNC/UPDATES
        const previousMatches = [...matchesRef.current];

        // 1. OPTIMISTIC UPDATE
        setMatches(newMatches);
        isSavingRef.current = true; // Lock snapshots

        // 2. PERSISTENCE
        if (isFirebaseConfigured && isAuthenticated) {
            try {
                // Identify what to save
                let changesToSave = [];

                // ALWAYS perform a diff check.
                const payload = newMatches.map(m => mapToSnake(m));
                changesToSave = payload.filter(p => {
                    const old = previousMatches.find(m => m.id === p.id);
                    if (!old) return true;

                    const oldSnake = mapToSnake(old);

                    if (p.manual_order !== oldSnake.manual_order) return true;
                    if (p.court !== oldSnake.court) return true;
                    if (p.winner_id !== oldSnake.winner_id) return true;
                    if (p.score1 !== oldSnake.score1 || p.score2 !== oldSnake.score2) return true;
                    if (p.status !== oldSnake.status) return true;
                    if (p.micro_points !== oldSnake.micro_points) return true;
                    if (p.finished_at !== oldSnake.finished_at) return true;

                    return false;
                });

                if (changesToSave.length > 0) {
                    const promises = changesToSave.map(match => {
                        const docRef = doc(db, "matches", match.id);
                        return setDoc(docRef, match);
                    });

                    await Promise.all(promises);
                    console.log(`[MatchesContext] Saved ${changesToSave.length} matches to Firebase.`);
                }
            } catch (e) {
                console.error("Error saving matches:", e);
            } finally {
                // Release lock with slight delay
                setTimeout(() => {
                    isSavingRef.current = false;
                }, 500);
            }
        } else {
            // LS
            console.log(`[MatchesContext] Saving to LS: ${lsKey}`);
            localStorage.setItem(lsKey, JSON.stringify(newMatches));

            // Also update global state for backup
            localStorage.setItem('ricochet_matches_backup', JSON.stringify(newMatches));

            isSavingRef.current = false;
        }
    }, [isAuthenticated, activeTournamentId, lsKey]);

    const resetMatches = async () => {
        if (!isAuthenticated || !activeTournamentId) return;

        setIsSaving(true);
        try {
            if (isFirebaseConfigured) {
                const q = query(collection(db, "matches"), where("tournament_id", "==", activeTournamentId));
                const snapshot = await getDocs(q);
                const batch = writeBatch(db);
                snapshot.docs.forEach((docSnap) => {
                    batch.delete(docSnap.ref);
                });
                await batch.commit();
            } else {
                localStorage.removeItem(lsKey);
            }
            setMatches([]);
        } catch (e) {
            console.error("Error resetting matches:", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <MatchesContext.Provider value={{ matches, saveMatches, resetMatches, isSaving }}>
            {children}
        </MatchesContext.Provider>
    );
};

export const useMatchesContext = () => {
    const context = useContext(MatchesContext);
    if (!context) {
        throw new Error("useMatchesContext must be used within MatchesProvider");
    }
    return context;
};
