import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

    // --- MAPPERS ---
    const mapToCamel = (m) => {
        let mp = [];
        try {
            mp = typeof m.micro_points === 'string' ? JSON.parse(m.micro_points) : (m.micro_points || []);
        } catch (e) {
            mp = m.micro_points || [];
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
                    const loaded = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })).map(mapToCamel);

                    // Simple Diff Check could be here, but for now just set
                    setMatches(loaded);
                    console.log(`[MatchesContext] Loaded ${loaded.length} matches from Firebase`);
                }, (error) => {
                    console.error("[MatchesContext] Firebase Error:", error);
                });
            } else {
                // LS Fallback
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

    // --- ACTIONS ---
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
            setMatches([]); // Clear local immediately
        } catch (e) {
            console.error("Error resetting matches:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const saveMatches = useCallback(async (newMatches, specificMatchId = null) => {
        if (!activeTournamentId) {
            console.error("No active tournament ID, cannot save!");
            return;
        }

        // 1. OPTIMISTIC UPDATE
        setMatches(newMatches);

        // 2. PERSISTENCE
        if (isFirebaseConfigured && isAuthenticated) {

            try {
                const { setDoc } = await import('firebase/firestore');

                let changesToSave = [];

                if (specificMatchId) {
                    console.log("DEBUG: Target Save for Match ID:", specificMatchId);
                    const target = newMatches.find(m => m.id === specificMatchId);
                    if (target) {
                        changesToSave = [mapToSnake(target)];
                    } else {
                        console.warn("DEBUG: Target match not found in new state!", specificMatchId);
                    }
                } else {
                    // Fallback to Diff Logic or Bulk Save
                    const payload = newMatches.map(m => mapToSnake(m));
                    changesToSave = payload.filter(p => {
                        const old = matches.find(m => m.id === p.id);
                        if (!old) return true;
                        const oldSnake = mapToSnake(old);
                        return JSON.stringify(oldSnake) !== JSON.stringify(p);
                    });
                }

                if (changesToSave.length === 0) {
                    // console.log("No changes detected.");
                    return;
                }

                const promises = changesToSave.map(match => {
                    console.log("DEBUG: Sending SINGLE match to Firestore:", match.id, match);
                    const docRef = doc(db, "matches", match.id);
                    return setDoc(docRef, match);
                });

                Promise.all(promises).catch(err => console.error("Async Save Error:", err));

            } catch (e) {
                console.error("Error initiating save:", e);
            }
        } else {
            // LS
            localStorage.setItem(lsKey, JSON.stringify(newMatches));
        }
    }, [isAuthenticated, activeTournamentId, lsKey, matches]); // Added matches to deps for Diffing

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
