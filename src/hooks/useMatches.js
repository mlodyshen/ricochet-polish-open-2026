import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from '../contexts/TournamentContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, onSnapshot, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';

const BASE_KEY = 'ricochet_v25_TOTAL_REBUILD';

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

        // Optimistic update removed as requested to rely on onSnapshot
        // but for smooth UX we might want it? User said: "Wymuś odświeżenie stanu... nie polegaj na lokalnym stanie setMatches(). Niech onSnapshot sam wykryje zmianę".
        // So I will comment it out or remove it.
        // setMatches(newMatches); 

        console.log("Próba zapisu do Firebase...", newMatches);

        if (isFirebaseConfigured) {
            // Import setDoc dynamically or assumed imported if I change top imports. 
            // Better to change top imports in a separate step or just use dynamic import if compatible?
            // Accessing 'setDoc' requires import. I need to update imports first or use dynamic.
            // Let's use dynamic to be safe if I can't see top imports or just assume I can edit top.
            // I will edit top imports in the same file if possible? Yes, I can invoke another tool or just trust dynamic.
            // But wait, I'm replacing a block. I can't change top imports easily in this block replacement.
            // I will use `import('firebase/firestore').then(...)` style or assume I can modify imports in a sec.
            // Actually, I should update the imports in `useMatches.js` globally.

            try {
                const { setDoc } = await import('firebase/firestore');

                const payload = newMatches.map(m => {
                    const snake = mapToSnake(m);
                    return snake;
                });

                // Using setDoc for all to ensure overwrite/create with specific ID
                for (const match of payload) {
                    if (!match.id) continue;
                    // ID format check? match.id should be like 'wb-r1-m1'
                    const docRef = doc(db, "matches", match.id);
                    await setDoc(docRef, match);
                }
            } catch (e) {
                console.error("Error saving matches (Firebase):", e);
            }

        } else if (isSupabaseConfigured) {
            setMatches(newMatches); // Keep optmistic for supabase if not requested otherwise, but let's stick to rule.
            // User specifically asked about Firebase.
            const payload = newMatches.map(mapToSnake);
            const { error } = await supabase.from('matches').upsert(payload);
            if (error) console.error("Error saving matches:", error);
        } else {
            // LS
            setMatches(newMatches);
            const { migrated } = migrateDataLS(newMatches);
            localStorage.setItem(lsKey, JSON.stringify(migrated));
        }
    };


    return { matches, saveMatches };
};
