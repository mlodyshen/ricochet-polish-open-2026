import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';

const TournamentContext = createContext(null);
const LOCAL_META_KEY = 'ricochet_tournaments_meta';

export const TournamentProvider = ({ children }) => {
    const [tournaments, setTournaments] = useState([]);
    const [activeTournamentId, setActiveTournamentId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Fetch (Triple Mode: Firebase > Supabase > Local Storage)
    useEffect(() => {
        let unsubscribe;

        const initData = async () => {
            if (isFirebaseConfigured) {
                // FIREBASE MODE (Realtime)
                const q = query(collection(db, "tournaments"), orderBy("created_at", "desc"));
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const loaded = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        // Convert Firestore timestamp to ISO string if needed, or keep as is
                        date: doc.data().date || new Date().toISOString()
                    }));
                    setTournaments(loaded);
                    setIsLoading(false);
                }, (error) => {
                    console.error("Firebase Error:", error);
                    setIsLoading(false);
                });
            } else if (isSupabaseConfigured) {
                // SUPABASE MODE
                try {
                    const { data, error } = await supabase
                        .from('tournaments')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    setTournaments(data || []);
                } catch (err) {
                    console.error("Error loading tournaments:", err.message);
                } finally {
                    setIsLoading(false);
                }
            } else {
                // LOCAL STORAGE MODE
                const stored = localStorage.getItem(LOCAL_META_KEY);
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (parsed.length === 0) {
                            // Seed default if empty array found (edge case)
                            const defaultT = {
                                id: 'default-rpo-2026',
                                name: 'RICOCHET POLISH OPEN 2026',
                                date: new Date().toISOString(),
                                status: 'setup',
                                address: 'Warszawa'
                            };
                            setTournaments([defaultT]);
                            localStorage.setItem(LOCAL_META_KEY, JSON.stringify([defaultT]));
                        } else {
                            setTournaments(parsed);
                        }
                    } catch (e) {
                        console.error("LS Parse Error", e);
                        setTournaments([]);
                    }
                } else {
                    // Seed default tournament for new users
                    const defaultT = {
                        id: 'default-rpo-2026',
                        name: 'RICOCHET POLISH OPEN 2026',
                        date: new Date().toISOString(),
                        status: 'setup',
                        address: 'Warszawa'
                    };
                    setTournaments([defaultT]);
                    localStorage.setItem(LOCAL_META_KEY, JSON.stringify([defaultT]));
                }
                setIsLoading(false);
            }
        };

        initData();

        // Realtime Subscription (Only Supabase Legacy, Firebase handles it in initData)
        let channel;
        if (!isFirebaseConfigured && isSupabaseConfigured) {
            channel = supabase
                .channel('public:tournaments')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => {
                    initData(); // Re-fetch
                })
                .subscribe();
        }

        return () => {
            if (unsubscribe) unsubscribe();
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    // Handle Active ID persistence
    useEffect(() => {
        const savedId = localStorage.getItem('ricochet_active_id');
        if (savedId && tournaments.some(t => t.id === savedId)) {
            setActiveTournamentId(savedId);
        } else if (tournaments.length > 0 && !activeTournamentId) {
            setActiveTournamentId(tournaments[0].id);
        }
    }, [tournaments]);

    const selectTournament = (id) => {
        setActiveTournamentId(id);
        localStorage.setItem('ricochet_active_id', id);
    };

    const createTournament = async (name) => {
        if (isFirebaseConfigured) {
            try {
                const docRef = await addDoc(collection(db, "tournaments"), {
                    name,
                    date: new Date().toISOString(),
                    status: 'setup',
                    created_at: serverTimestamp()
                });
                selectTournament(docRef.id);
                return docRef.id;
            } catch (e) {
                console.error("Error creating tournament (Firebase):", e);
                return null;
            }
        } else if (isSupabaseConfigured) {
            // SUPABASE
            try {
                const { data, error } = await supabase
                    .from('tournaments')
                    .insert([{
                        name,
                        date: new Date().toISOString(),
                        status: 'setup'
                    }])
                    .select()
                    .single();

                if (error) throw error;
                // Optimistic
                setTournaments(prev => [data, ...prev]);
                selectTournament(data.id);
                return data.id;
            } catch (err) {
                console.error("Error creating tournament:", err);
                alert("Błąd podczas tworzenia turnieju (Supabase). Sprawdź konsolę.");
                return null;
            }
        } else {
            // LOCAL STORAGE
            const newId = crypto.randomUUID();
            const newTournament = {
                id: newId,
                name: name,
                date: new Date().toISOString(),
                status: 'setup',
                address: ''
            };
            const updated = [newTournament, ...tournaments];
            setTournaments(updated);
            localStorage.setItem(LOCAL_META_KEY, JSON.stringify(updated));
            selectTournament(newId);
            return newId;
        }
    };

    const updateTournament = async (id, updates) => {
        if (isFirebaseConfigured) {
            try {
                const docRef = doc(db, "tournaments", id);
                await updateDoc(docRef, updates);
            } catch (e) {
                console.error("Error updating (Firebase):", e);
            }
        } else if (isSupabaseConfigured) {
            try {
                const { error } = await supabase.from('tournaments').update(updates).eq('id', id);
                if (error) throw error;
                setTournaments(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
            } catch (err) {
                console.error("Error updating tournament:", err);
            }
        } else {
            const updated = tournaments.map(t => t.id === id ? { ...t, ...updates } : t);
            setTournaments(updated);
            localStorage.setItem(LOCAL_META_KEY, JSON.stringify(updated));
        }
    };

    const deleteTournament = async (id) => {
        if (isFirebaseConfigured) {
            try {
                await deleteDoc(doc(db, "tournaments", id));
            } catch (e) {
                console.error("Error deleting (Firebase):", e);
            }
        } else if (isSupabaseConfigured) {
            try {
                const { error } = await supabase.from('tournaments').delete().eq('id', id);
                if (error) throw error;
                setTournaments(prev => prev.filter(t => t.id !== id));
            } catch (err) {
                console.error("Error deleting tournament:", err);
            }
        } else {
            const updated = tournaments.filter(t => t.id !== id);
            setTournaments(updated);
            localStorage.setItem(LOCAL_META_KEY, JSON.stringify(updated));

            // Clean related local storage keys
            // Note: In real app we might iterate all keys but simplified known keys here
            localStorage.removeItem(`ricochet_players_db_${id}`);
            localStorage.removeItem(`ricochet_bracket_data_${id}`);
        }

        if (activeTournamentId === id) {
            const remaining = tournaments.filter(t => t.id !== id);
            const nextId = remaining.length > 0 ? remaining[0].id : null;
            setActiveTournamentId(nextId);
            if (nextId) localStorage.setItem('ricochet_active_id', nextId);
            else localStorage.removeItem('ricochet_active_id');
        }
    };

    return (
        <TournamentContext.Provider value={{
            tournaments,
            activeTournamentId,
            selectTournament,
            createTournament,
            updateTournament,
            deleteTournament,
            isLoading
        }}>
            {children}
        </TournamentContext.Provider>
    );
};

export const useTournament = () => {
    const context = useContext(TournamentContext);
    if (!context) {
        throw new Error("useTournament must be used within TournamentProvider");
    }
    return context;
};
