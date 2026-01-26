import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from '../contexts/TournamentContext';
import { supabase } from '../lib/supabase';

export const useMatches = () => {
    const [matches, setMatches] = useState([]);
    const { isAuthenticated } = useAuth();
    const { activeTournamentId } = useTournament();

    const mapToCamel = (m) => {
        let mp = [];
        try {
            mp = typeof m.micro_points === 'string' ? JSON.parse(m.micro_points) : (m.micro_points || []);
        } catch (e) { console.warn("MicroPoints parse error", e); }

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

    useEffect(() => {
        if (!activeTournamentId) {
            setMatches([]);
            return;
        }

        const fetchMatches = async () => {
            const { data, error } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', activeTournamentId);

            if (!error && data) {
                setMatches(data.map(mapToCamel));
            }
        };

        fetchMatches();

        const channel = supabase
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

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeTournamentId]);

    const saveMatches = async (newMatches) => {
        if (!isAuthenticated || !activeTournamentId) return;

        setMatches(newMatches);

        const payload = newMatches.map(mapToSnake);

        const { error } = await supabase
            .from('matches')
            .upsert(payload);

        if (error) {
            console.error("Error saving matches:", error);
        }
    };

    return { matches, saveMatches };
};
