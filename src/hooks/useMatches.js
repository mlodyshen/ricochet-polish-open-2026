import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from '../contexts/TournamentContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, onSnapshot, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';

const BASE_KEY = 'ricochet_bracket_data';

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
        bracket_type: m.bracket,
        round_id: m.round,
        player1_id: m.player1Id,
        player2_id: m.player2Id,
        score1: m.score1,
        score2: m.score2,
        micro_points: JSON.stringify(m.microPoints || []),
        winner_id: m.winnerId,
        status: m.status,
        court: m.court
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
            } else if (isSupabaseConfigured) {
                // SUPABASE
                const { data, error } = await supabase
                    .from('matches')
                    .select('*')
                    .eq('tournament_id', activeTournamentId);

                if (!error && data) {
                    setMatches(data.map(mapToCamel));
                }
            } else {
                // LOCAL STORAGE
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

        let channel;
        if (!isFirebaseConfigured && isSupabaseConfigured) {
            channel = supabase
                .channel(`matches:${activeTournamentId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'matches',
                    filter: `tournament_id=eq.${activeTournamentId}`
                }, () => {
                    fetchMatches();
                })
                .subscribe();
        } else if (!isFirebaseConfigured && !isSupabaseConfigured) {
            // LS Listener
            const loadLS = () => fetchMatches();
            window.addEventListener('storage', loadLS);
            return () => window.removeEventListener('storage', loadLS);
        }

        return () => {
            if (unsubscribe) unsubscribe();
            if (channel) supabase.removeChannel(channel);
        };
    }, [activeTournamentId, lsKey]);

    const saveMatches = async (newMatches) => {
        if (!isAuthenticated || !activeTournamentId) return;

        setMatches(newMatches);

        if (isFirebaseConfigured) {
            const batch = writeBatch(db);
            // Note: This is a full overwrite strategy in LS, but in DB we usually upsert.
            // Given the complexity of diffing, we'll try to upsert all for now,
            // BUT be aware of write costs. Ideally we only save changed matches.
            // For now, let's assume we save all to keep it simple as requested,
            // or iterate. The issue with 'newMatches' is it's the whole state.
            // Let's rely on the fact that usually only one match changes at a time in the UI,
            // but sometimes batch generation happens.
            // Optimisation: For this specific app, let's just loop and set.
            // Be careful about ID. If ID exists, set. If not, add (but we need custom ID or stick to auto).
            // The current app seems to rely on 'id' being present?
            // If ids are UUIDs generated by client, we can use setDoc.

            try {
                const payload = newMatches.map(m => {
                    const snake = mapToSnake(m);
                    // ensure ID is preserved if it exists, or generate one if missing?
                    // If we are migrating from LS, ids might be UUIDs.
                    return snake;
                });

                // We can't easily batch 1000 items. Limit is 500.
                // Also we probably shouldn't overwrite EVERYTHING every time a score changes.
                // But refactoring the whole app to save only delta is hard.
                // Let's try to save each item.
                // A smarter way: verify which match changed?
                // For now, let's just traverse and set.
                for (const match of payload) {
                    if (!match.id) continue;
                    const docRef = doc(db, "matches", match.id);
                    await updateDoc(docRef, match).catch(async (e) => {
                        // If not found, set (create)
                        if (e.code === 'not-found') {
                            // Use setDoc to force specific ID
                            const { setDoc } = await import('firebase/firestore');
                            await setDoc(docRef, match);
                        } else {
                            console.error("Single match save error", e);
                        }
                    });
                }
            } catch (e) {
                console.error("Error saving matches (Firebase):", e);
            }

        } else if (isSupabaseConfigured) {
            const payload = newMatches.map(mapToSnake);
            const { error } = await supabase.from('matches').upsert(payload);
            if (error) console.error("Error saving matches:", error);
        } else {
            // LS
            // Ensure migration consistency
            const { migrated } = migrateDataLS(newMatches);
            localStorage.setItem(lsKey, JSON.stringify(migrated));
        }
    };

    return { matches, saveMatches };
};
