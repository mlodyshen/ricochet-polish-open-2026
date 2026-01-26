import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TournamentContext = createContext(null);

export const TournamentProvider = ({ children }) => {
    const [tournaments, setTournaments] = useState([]);
    const [activeTournamentId, setActiveTournamentId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Fetch & Realtime
    useEffect(() => {
        const fetchTournaments = async () => {
            try {
                const { data, error } = await supabase
                    .from('tournaments')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTournaments(data || []);
            } catch (err) {
                console.error("Error loading tournaments:", err.message);
                // If table doesn't exist or connection fails, we might end up here.
            } finally {
                setIsLoading(false);
            }
        };

        fetchTournaments();

        const channel = supabase
            .channel('public:tournaments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => {
                fetchTournaments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Handle Active ID persistence
    useEffect(() => {
        const savedId = localStorage.getItem('ricochet_active_id');
        // If we have a saved ID and it exists in the loaded list, use it
        if (savedId && tournaments.some(t => t.id === savedId)) {
            setActiveTournamentId(savedId);
        } else if (tournaments.length > 0 && !activeTournamentId) {
            // Default to first if none selected or saved is invalid
            setActiveTournamentId(tournaments[0].id);
        }
    }, [tournaments]);

    const selectTournament = (id) => {
        setActiveTournamentId(id);
        localStorage.setItem('ricochet_active_id', id);
    };

    const createTournament = async (name) => {
        try {
            const { data, error } = await supabase
                .from('tournaments')
                .insert([{
                    name,
                    date: new Date().toISOString(),
                    status: 'setup' // Default status
                }])
                .select()
                .single();

            if (error) throw error;

            // Optimistic update or wait for subscription
            // setTournaments(prev => [data, ...prev]); 
            // Realtime will handle update, but let's be snappy:
            setTournaments(prev => [data, ...prev]);

            selectTournament(data.id);
            return data.id;
        } catch (err) {
            console.error("Error creating tournament:", err);
            alert("Błąd podczas tworzenia turnieju. Sprawdź połączenie.");
            return null;
        }
    };

    const updateTournament = async (id, updates) => {
        try {
            const { error } = await supabase
                .from('tournaments')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            setTournaments(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        } catch (err) {
            console.error("Error updating tournament:", err);
        }
    };

    const deleteTournament = async (id) => {
        try {
            const { error } = await supabase
                .from('tournaments')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setTournaments(prev => prev.filter(t => t.id !== id));

            // Cleanup active Selection
            if (activeTournamentId === id) {
                const remaining = tournaments.filter(t => t.id !== id);
                const nextId = remaining.length > 0 ? remaining[0].id : null;
                setActiveTournamentId(nextId);
                if (nextId) localStorage.setItem('ricochet_active_id', nextId);
                else localStorage.removeItem('ricochet_active_id');
            }
        } catch (err) {
            console.error("Error deleting tournament:", err);
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
