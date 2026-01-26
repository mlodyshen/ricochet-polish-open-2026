import React, { createContext, useContext, useState, useEffect } from 'react';

const META_KEY = 'ricochet_tournaments_meta';
const ACTIVE_KEY_ADMIN = 'ricochet_active_tournament_admin';
const ACTIVE_KEY_GUEST = 'ricochet_active_tournament_guest';

const TournamentContext = createContext(null);

export const TournamentProvider = ({ children }) => {
    const [tournaments, setTournaments] = useState([]);
    const [activeTournamentId, setActiveTournamentId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load Meta
    useEffect(() => {
        const stored = localStorage.getItem(META_KEY);
        let parsed = [];
        if (stored) {
            try {
                parsed = JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse tournaments meta", e);
            }
        }

        // Migration: If no tournaments but we have legacy data?
        // Let's skip complex migration for now and just start fresh or manual.
        // Or actually, let's auto-create a "Default" if empty to not lose the user's current progress.
        if (parsed.length === 0) {
            const legacyPlayers = localStorage.getItem('ricochet_players_db');
            if (legacyPlayers) {
                const defaultId = 'legacy-default';
                parsed.push({ id: defaultId, name: 'RPO 2026 (Default)', date: new Date().toISOString() });
                // We need to move data? Or just aliasing?
                // For simplicity, let's keep legacy keys as fallback OR copy them.
                // Let's copy them to be clean.
                localStorage.setItem(`ricochet_players_db_${defaultId}`, legacyPlayers);
                const legacyBracket = localStorage.getItem('ricochet_bracket_data');
                if (legacyBracket) localStorage.setItem(`ricochet_bracket_data_${defaultId}`, legacyBracket);

                localStorage.setItem(META_KEY, JSON.stringify(parsed));
            }
        }

        setTournaments(parsed);
        setIsLoading(false);
    }, []);

    // Load Active ID (Session based? Or Local?)
    // Admin and Guest might look at different things? 
    // Actually, usually "Active" is global for the browser tab application state.
    useEffect(() => {
        const savedId = localStorage.getItem('ricochet_active_id');
        if (savedId) setActiveTournamentId(savedId);
        else if (tournaments.length > 0) setActiveTournamentId(tournaments[0].id);
    }, [tournaments]);

    const selectTournament = (id) => {
        setActiveTournamentId(id);
        localStorage.setItem('ricochet_active_id', id);
    };

    const createTournament = (name) => {
        const newId = crypto.randomUUID();
        const newTournament = {
            id: newId,
            name: name,
            date: new Date().toISOString(),
            address: ''
        };
        const updated = [...tournaments, newTournament];
        setTournaments(updated);
        localStorage.setItem(META_KEY, JSON.stringify(updated));

        // Auto select
        selectTournament(newId);
        return newId;
    };

    const updateTournament = (id, updates) => {
        const updated = tournaments.map(t =>
            t.id === id ? { ...t, ...updates } : t
        );
        setTournaments(updated);
        localStorage.setItem(META_KEY, JSON.stringify(updated));
    };

    const deleteTournament = (id) => {
        // Confirmation is handled by the UI component
        const updated = tournaments.filter(t => t.id !== id);
        setTournaments(updated);
        localStorage.setItem(META_KEY, JSON.stringify(updated));

        // Items cleanup
        localStorage.removeItem(`ricochet_players_db_${id}`);
        localStorage.removeItem(`ricochet_bracket_data_${id}`);

        if (activeTournamentId === id) {
            setActiveTournamentId(updated.length > 0 ? updated[0].id : null);
            localStorage.removeItem('ricochet_active_id');
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
