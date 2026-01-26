import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from '../contexts/TournamentContext';

const BASE_KEY = 'ricochet_bracket_data';

export const useMatches = () => {
    const [matches, setMatches] = useState([]);
    const { isAuthenticated } = useAuth();
    const { activeTournamentId } = useTournament();

    const storageKey = activeTournamentId ? `${BASE_KEY}_${activeTournamentId}` : null;

    const migrateData = (rawMatches) => {
        let changed = false;
        const migrated = rawMatches.map(m => {
            const newM = { ...m };

            // Normalize ID fields
            if (m.player1?.id && !m.player1Id) {
                newM.player1Id = m.player1.id;
                delete newM.player1;
                changed = true;
            }
            if (m.player2?.id && !m.player2Id) {
                newM.player2Id = m.player2.id;
                delete newM.player2;
                changed = true;
            }
            // Normalize Snake Case to Camel
            if (m.bracket_type) {
                newM.bracket = m.bracket_type;
                delete newM.bracket_type;
                changed = true;
            }
            if (m.round_id) {
                newM.round = m.round_id;
                delete newM.round_id;
                changed = true;
            }
            if (m.winner_id) {
                newM.winnerId = m.winner_id;
                delete newM.winner_id;
                changed = true;
            }
            if (m.micro_points && !m.microPoints) {
                newM.microPoints = m.micro_points;
                delete newM.micro_points;
                changed = true;
            }
            return newM;
        });

        return { migrated, changed };
    };

    const fetchMatches = () => {
        if (!storageKey) return;
        try {
            const saved = localStorage.getItem(storageKey);
            const raw = saved ? JSON.parse(saved) : [];

            const { migrated, changed } = migrateData(raw);

            setMatches(migrated);
            if (changed) {
                console.log("Migrated match data to new schema.");
                // Only save if admin? No, local storage migration is safe for local mode.
                // But generally only admin saves. 
                // However, if we don't save, we migrate every time.
                // For local mode, we can auto-save migration.
                localStorage.setItem(storageKey, JSON.stringify(migrated));
            }
        } catch (e) {
            console.error("LS Error", e);
            setMatches([]);
        }
    };

    useEffect(() => {
        fetchMatches();

        const loadLS = () => fetchMatches();
        window.addEventListener('storage', loadLS);
        return () => window.removeEventListener('storage', loadLS);
    }, [storageKey]);

    const saveMatches = (newMatches) => {
        if (!isAuthenticated || !storageKey) return;

        // Ensure we save clean data (just in case)
        const { migrated } = migrateData(newMatches);

        setMatches(migrated);
        localStorage.setItem(storageKey, JSON.stringify(migrated));
    };

    return { matches, saveMatches };
};
