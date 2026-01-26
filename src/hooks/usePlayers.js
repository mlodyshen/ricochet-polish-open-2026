import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from '../contexts/TournamentContext';

const BASE_KEY = 'ricochet_players_db';

export const usePlayers = () => {
    const [players, setPlayers] = useState([]);
    const { isAuthenticated } = useAuth();
    const { activeTournamentId } = useTournament();

    // Key depends on activeTournamentId
    // If we have an ID: `ricochet_players_db_${id}`
    // Backwards compat: If user migrated, everything has ID.
    // If context is creating default, we rely on that.
    const storageKey = activeTournamentId ? `${BASE_KEY}_${activeTournamentId}` : null;

    const fetchPlayers = () => {
        if (!storageKey) return;
        try {
            const stored = localStorage.getItem(storageKey);
            setPlayers(stored ? JSON.parse(stored) : []);
        } catch (e) {
            console.error("LS Error", e);
            setPlayers([]);
        }
    };

    useEffect(() => {
        fetchPlayers();

        const handleStorage = () => fetchPlayers();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [storageKey]);

    const saveToLS = (newPlayers) => {
        if (!storageKey) return;
        setPlayers(newPlayers);
        localStorage.setItem(storageKey, JSON.stringify(newPlayers));
    };

    const addPlayer = async (playerData) => {
        if (!isAuthenticated) return null;

        // Support both structures but store as snake_case for UI compatibility
        const fullName = playerData.full_name || playerData.fullName;

        const newPlayerObj = {
            id: crypto.randomUUID(),
            full_name: fullName,
            country: playerData.country || "",
            elo: playerData.elo ? parseInt(playerData.elo, 10) : 0
        };

        const updatedList = [...players, newPlayerObj];
        saveToLS(updatedList);
        return newPlayerObj;
    };

    const importPlayers = async (namesList) => {
        if (!isAuthenticated) return 0;
        // Not really used in local mode usually, or we can implement basic import
        // Assuming this is used for migration or bulk add
        return 0;
    };

    const updatePlayer = async (id, updates) => {
        if (!isAuthenticated) return;

        const updated = players.map(p => {
            if (p.id !== id) return p;

            // Normalize updates
            const newName = updates.full_name || updates.fullName;

            return {
                ...p,
                ...updates,
                full_name: newName !== undefined ? newName : p.full_name
            };
        });
        saveToLS(updated);
    };

    const deletePlayer = async (id) => {
        if (!isAuthenticated) return;
        saveToLS(players.filter(p => p.id !== id));
    };

    const bulkUpsertPlayers = async (playersList) => {
        // Fallback or implementation for local bulk add
        if (!isAuthenticated) return { success: false, error: 'Authorization required' };

        const newPlayers = playersList.map(p => ({
            id: crypto.randomUUID(),
            full_name: p.full_name || p.fullName,
            country: p.country,
            elo: p.elo === '-' || !p.elo ? 0 : parseInt(p.elo, 10)
        }));

        saveToLS([...players, ...newPlayers]);
        return { success: true, count: newPlayers.length };
    };

    return { players, addPlayer, importPlayers, updatePlayer, deletePlayer, bulkUpsertPlayers };
};


