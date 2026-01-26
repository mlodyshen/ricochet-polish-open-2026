import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from '../contexts/TournamentContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';

const BASE_KEY = 'ricochet_players_db';

export const usePlayers = () => {
    const [players, setPlayers] = useState([]);
    const { isAuthenticated } = useAuth();
    const { activeTournamentId } = useTournament();

    const lsKey = activeTournamentId ? `${BASE_KEY}_${activeTournamentId}` : null;

    useEffect(() => {
        if (!activeTournamentId) {
            setPlayers([]);
            return;
        }

        let unsubscribe;

        const fetchPlayers = async () => {
            if (isFirebaseConfigured) {
                // FIREBASE
                const q = query(collection(db, "players"), where("tournament_id", "==", activeTournamentId));
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const loaded = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setPlayers(loaded);
                }, (error) => {
                    console.error("Firebase Players Error:", error);
                });
            } else if (isSupabaseConfigured) {
                // SUPABASE
                const { data, error } = await supabase
                    .from('players')
                    .select('*')
                    .eq('tournament_id', activeTournamentId);

                if (!error && data) {
                    setPlayers(data);
                }
            } else {
                // LOCAL STORAGE
                try {
                    const stored = localStorage.getItem(lsKey);
                    setPlayers(stored ? JSON.parse(stored) : []);
                } catch (e) {
                    console.error("LS Error", e);
                    setPlayers([]);
                }
            }
        };

        fetchPlayers();

        // Subscription (Supabase Only, Firebase handled above)
        let channel;
        if (!isFirebaseConfigured && isSupabaseConfigured) {
            channel = supabase
                .channel(`players:${activeTournamentId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'players',
                    filter: `tournament_id=eq.${activeTournamentId}`
                }, () => {
                    fetchPlayers();
                })
                .subscribe();
        } else if (!isFirebaseConfigured && !isSupabaseConfigured) {
            // LS Event Listener
            const handleStorage = () => fetchPlayers();
            window.addEventListener('storage', handleStorage);
            return () => window.removeEventListener('storage', handleStorage);
        }

        return () => {
            if (unsubscribe) unsubscribe();
            if (channel) supabase.removeChannel(channel);
        };
    }, [activeTournamentId, lsKey]);

    const addPlayer = async (playerData) => {
        if (!isAuthenticated || !activeTournamentId) return null;

        const fullName = playerData.full_name || playerData.fullName;
        // Normalize object structure for both backends
        const newPlayer = {
            tournament_id: activeTournamentId,
            full_name: fullName,
            country: playerData.country || "",
            elo: playerData.elo ? parseInt(playerData.elo, 10) : 0
        };

        if (isFirebaseConfigured) {
            try {
                const docRef = await addDoc(collection(db, "players"), newPlayer);
                // We don't manually update state because onSnapshot does it
                return { ...newPlayer, id: docRef.id };
            } catch (e) {
                console.error("Error adding player (Firebase):", e);
                return null;
            }
        } else if (isSupabaseConfigured) {
            const { data, error } = await supabase
                .from('players')
                .insert([newPlayer])
                .select()
                .single();

            if (error) {
                console.error("Error adding player:", error);
                return null;
            }
            setPlayers(prev => [...prev, data]);
            return data;
        } else {
            // LS
            const playerObj = {
                ...newPlayer,
                id: crypto.randomUUID() // Client-side ID generation
            };
            const updated = [...players, playerObj];
            setPlayers(updated);
            localStorage.setItem(lsKey, JSON.stringify(updated));
            return playerObj;
        }
    };

    const importPlayers = async (namesList) => {
        // Basic impl for now
        return 0;
    };

    const updatePlayer = async (id, updates) => {
        if (!isAuthenticated) return;

        if (isFirebaseConfigured) {
            try {
                const docRef = doc(db, "players", id);
                await updateDoc(docRef, updates);
            } catch (e) {
                console.error("Error updating player (Firebase):", e);
            }
        } else if (isSupabaseConfigured) {
            const { error } = await supabase.from('players').update(updates).eq('id', id);
            if (error) console.error("Error updating player:", error);
            else setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        } else {
            const updated = players.map(p => {
                if (p.id !== id) return p;
                // mapping updates to handle fullName vs full_name if needed
                return { ...p, ...updates };
            });
            setPlayers(updated);
            localStorage.setItem(lsKey, JSON.stringify(updated));
        }
    };

    const deletePlayer = async (id) => {
        if (!isAuthenticated) return;

        if (isFirebaseConfigured) {
            try {
                await deleteDoc(doc(db, "players", id));
            } catch (e) {
                console.error("Error deleting player (Firebase):", e);
            }
        } else if (isSupabaseConfigured) {
            const { error } = await supabase.from('players').delete().eq('id', id);
            if (error) console.error("Error deleting player:", error);
            else setPlayers(prev => prev.filter(p => p.id !== id));
        } else {
            const updated = players.filter(p => p.id !== id);
            setPlayers(updated);
            localStorage.setItem(lsKey, JSON.stringify(updated));
        }
    };

    const bulkUpsertPlayers = async (playersList) => {
        if (!isAuthenticated || !activeTournamentId) return { success: false, error: 'Authorization required' };

        const newPlayersBase = playersList.map(p => ({
            tournament_id: activeTournamentId,
            full_name: p.full_name || p.fullName,
            country: p.country,
            elo: p.elo === '-' || !p.elo ? 0 : parseInt(p.elo, 10)
        }));

        if (isFirebaseConfigured) {
            // Firestore doesn't support bulk insert simply like SQL.
            // We do batch writes.
            try {
                // Note: Firestore batch limit is 500 ops.
                const batchSize = 500;
                let count = 0;
                // Ideally split into chunks, but assuming small list for now
                // Actually we can map them to promises for parallel addDoc if not using batch object strictly for ID gen reasons
                // or use writeBatch()
                // Let's us writeBatch for atomicity if possible, but we need IDs.
                // Simple loop for now:
                for (const p of newPlayersBase) {
                    await addDoc(collection(db, "players"), p);
                    count++;
                }
                return { success: true, count };
            } catch (e) {
                return { success: false, error: e };
            }
        } else if (isSupabaseConfigured) {
            const { data, error } = await supabase.from('players').upsert(newPlayersBase).select();
            if (error) return { success: false, error };
            return { success: true, count: data.length };
        } else {
            const newPlayers = newPlayersBase.map(p => ({ ...p, id: crypto.randomUUID() }));
            const updated = [...players, ...newPlayers];
            setPlayers(updated);
            localStorage.setItem(lsKey, JSON.stringify(updated));
            return { success: true, count: newPlayers.length };
        }
    };

    return { players, addPlayer, importPlayers, updatePlayer, deletePlayer, bulkUpsertPlayers };
};
