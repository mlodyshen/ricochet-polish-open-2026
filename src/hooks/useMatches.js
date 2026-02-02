import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from '../contexts/TournamentContext';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, onSnapshot, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';

const BASE_KEY = 'brazilian_v4_PLACEMENT_SYSTEM_FINAL';

export const useMatches = () => {
    const [matches, setMatches] = useState([]);
    const { isAuthenticated } = useAuth();
    const { activeTournamentId } = useTournament();

    const lsKey = activeTournamentId ? `${BASE_KEY}_${activeTournamentId}` : null;

    // Supabase needs snake_case, App uses CamelCase.
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

    // Local Storage Legacy Migration / Normalization
    const migrateDataLS = (rawMatches) => {
        let changed = false;
        const migrated = rawMatches.map(m => {
            const newM = { ...m };
            if (m.player1?.id && !m.player1Id) { newM.player1Id = m.player1.id; delete newM.player1; changed = true; }
            if (m.player2?.id && !m.player2Id) { newM.player2Id = m.player2.id; delete newM.player2; changed = true; }
            if (m.bracket_type) { newM.bracket = m.bracket_type; delete newM.bracket_type; changed = true; }
            if (m.round_id) { newM.round = m.round_id; delete newM.round_id; changed = true; }
            if (m.winner_id) { newM.winnerId = m.winner_id; delete newM.winner_id; changed = true; }
            if (m.micro_points && !m.microPoints) { newM.microPoints = m.micro_points; delete newM.micro_points; changed = true; }
            return newM;
        });
        return { migrated, changed };
    };

    useEffect(() => {
        if (!activeTournamentId) {
            setMatches([]);
            return;
        }

        let unsubscribe;

        const fetchMatches = async () => {
            if (isFirebaseConfigured) {
                // FIREBASE
                const q = query(collection(db, "matches"), where("tournament_id", "==", activeTournamentId));
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const loaded = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })).map(mapToCamel);
                    setMatches(loaded);
                }, (error) => {
                    console.error("Firebase Matches Error:", error);
                });
            } else {
                // LOCAL STORAGE (Fallback only if Firebase off, which is unlikely given user statement, but safe to keep as non-supabase fallback)
                try {
                    const saved = localStorage.getItem(lsKey);
                    const raw = saved ? JSON.parse(saved) : [];
                    const { migrated, changed } = migrateDataLS(raw);
                    setMatches(migrated);
                    if (changed) {
                        localStorage.setItem(lsKey, JSON.stringify(migrated));
                    }
                } catch (e) {
                    console.error("LS Error", e);
                    setMatches([]);
                }
            }
        };

        fetchMatches();

        // No Supabase channel subscription anymore

        if (!isFirebaseConfigured) {
            // LS Listener
            const loadLS = () => fetchMatches();
            window.addEventListener('storage', loadLS);
            return () => window.removeEventListener('storage', loadLS);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [activeTournamentId, lsKey]);

    const saveMatches = async (newMatches) => {
        if (!isAuthenticated || !activeTournamentId) return;

        // console.log("Próba zapisu do Firebase...", newMatches);

        if (isFirebaseConfigured) {
            try {
                const { setDoc } = await import('firebase/firestore');

                const payload = newMatches.map(m => {
                    const snake = mapToSnake(m);
                    return snake;
                });

                // Using setDoc for all to ensure overwrite/create with specific ID
                for (const match of payload) {
                    if (!match.id) continue;
                    const docRef = doc(db, "matches", match.id);
                    await setDoc(docRef, match);
                }
            } catch (e) {
                console.error("Error saving matches (Firebase):", e);
            }

        } else {
            // LS
            setMatches(newMatches);
            const { migrated } = migrateDataLS(newMatches);
            localStorage.setItem(lsKey, JSON.stringify(migrated));
        }
    };


    return { matches, saveMatches };
};
