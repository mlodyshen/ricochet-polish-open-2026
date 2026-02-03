import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from './TournamentContext';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, onSnapshot, getDocs, doc, query, where, writeBatch } from 'firebase/firestore';

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
            court: m.court
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
        court: m.court || ""
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
                    // This prevents "flicker" or rewinding of state due to latency
                    if (isSavingRef.current) {
                        return;
                    }

                    const loaded = snapshot.docs.map(doc => {
                        // FORCE ID consistency: The document ID is the source of truth
                        return { id: doc.id, ...doc.data() };
                    })
                        // Filter out any garbage IDs that might have crept in
                        .filter(m => m.id && m.id.includes('-'))
                        .map(mapToCamel);

                    // Deduplicate logic: Map ensures unique IDs
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

    // Clean, Single Reference for Saving
    const saveMatches = useCallback(async (newMatches, specificMatchId = null) => {
        if (!activeTournamentId) {
            console.error("No active tournament ID, cannot save!");
            return;
        }

        // 1. OPTIMISTIC UPDATE
        setMatches(newMatches);
        isSavingRef.current = true; // Lock snapshots

        // 2. PERSISTENCE
        if (isFirebaseConfigured && isAuthenticated) {
            try {
                const { setDoc } = await import('firebase/firestore');

                // Identify what to save
                let changesToSave = [];

                if (specificMatchId) {
                    const target = newMatches.find(m => m.id === specificMatchId);
                    if (target) {
                        changesToSave = [mapToSnake(target)];
                    }
                } else {
                    // Save All / Diff
                    const currentMatches = matchesRef.current;
                    const payload = newMatches.map(m => mapToSnake(m));
                    changesToSave = payload.filter(p => {
                        const old = currentMatches.find(m => m.id === p.id);
                        if (!old) return true;
                        const oldSnake = mapToSnake(old);
                        return JSON.stringify(oldSnake) !== JSON.stringify(p);
                    });
                }

                if (changesToSave.length > 0) {
                    const promises = changesToSave.map(match => {
                        // STRICTLY write to the defined ID
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
            localStorage.setItem(lsKey, JSON.stringify(newMatches));
            isSavingRef.current = false;
        }
    }, [isAuthenticated, activeTournamentId, lsKey]);

    const resetMatches = async () => {
        if (!isAuthenticated || !activeTournamentId || !isFirebaseConfigured) return;
        try {
            setIsSaving(true);
            const q = query(collection(db, "matches"), where("tournament_id", "==", activeTournamentId));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
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
