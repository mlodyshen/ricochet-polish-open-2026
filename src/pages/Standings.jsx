
import React, { useMemo } from 'react';
import { useMatches } from '../hooks/useMatches';
import { usePlayers } from '../hooks/usePlayers';
import { Trophy, Medal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Standings = () => {
    const { t } = useTranslation();
    const { matches } = useMatches();
    const { players } = usePlayers();

    const standingsData = useMemo(() => {
        if (!matches || matches.length === 0) return Array(32).fill(null);

        const filledSlots = Array(32).fill(null);
        const setRank = (rank, playerId) => {
            if (rank >= 1 && rank <= 32) {
                filledSlots[rank - 1] = { rank, playerId };
            }
        };

        const m = (id) => matches.find(match => match.id === id);

        // 1. Top 4 (Special Logic)
        const gf = m('grand-final');
        if (gf && gf.status === 'finished' && gf.winnerId) {
            setRank(1, gf.winnerId);
            setRank(2, gf.winnerId === gf.player1Id ? gf.player2Id : gf.player1Id);
        }

        const cf = m('consolation-final');
        if (cf && cf.status === 'finished' && cf.winnerId) {
            // Winner goes to GF, Loser is 3rd
            const loserId = cf.winnerId === cf.player1Id ? cf.player2Id : cf.player1Id;
            setRank(3, loserId);
        }

        const lbf = m('lb-final');
        if (lbf && lbf.status === 'finished' && lbf.winnerId) {
            // Winner goes to Consolation, Loser is 4th
            const loserId = lbf.winnerId === lbf.player1Id ? lbf.player2Id : lbf.player1Id;
            setRank(4, loserId);
        }

        // 2. Monrad Placements (5-32)
        // Matches pX-f decide Rank X (Winner) and Rank X+1 (Loser)
        const placementBases = [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31];

        placementBases.forEach(baseRank => {
            const matchId = `p${baseRank}-f`;
            const match = m(matchId);
            if (match && match.status === 'finished' && match.winnerId) {
                setRank(baseRank, match.winnerId);
                const loserId = match.winnerId === match.player1Id ? match.player2Id : match.player1Id;
                setRank(baseRank + 1, loserId);
            }
        });

        return filledSlots;

    }, [matches, players]);

    const getPlayer = (id) => players.find(p => p.id === id);

    const renderRankIcon = (index) => {
        if (index === 0) return <Trophy size={24} color="#fbbf24" fill="#fbbf24" />; // Gold
        if (index === 1) return <Trophy size={24} color="#9ca3af" fill="#9ca3af" />; // Silver
        if (index === 2) return <Trophy size={24} color="#b45309" fill="#b45309" />; // Bronze
        return <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{index + 1}</span>;
    };

    return (
        <div className="card fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '0' }}>
            <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
                <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {t('navigation.standings')}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {t('standings.description')}
                </p>
            </div>

            <div className="standings-list">
                {standingsData.map((slot, index) => {
                    const player = slot ? getPlayer(slot.playerId) : null;
                    const isTop3 = index < 3;

                    return (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '1rem 2rem',
                                borderBottom: '1px solid var(--border-color)',
                                background: isTop3 && player ? 'var(--bg-secondary)' : 'transparent',
                                transition: 'all 0.2s',
                                fontWeight: isTop3 && player ? 600 : 400
                            }}
                        >
                            <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                                {renderRankIcon(index)}
                            </div>

                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {player ? (
                                    <>
                                        <div style={{ fontSize: '1.1rem' }}>
                                            {player.full_name}
                                        </div>
                                        {player.country && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>{player.country}</span>}
                                    </>
                                ) : (
                                    <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                        —
                                    </span>
                                )}
                            </div>

                            {/* Optional: Add ELO change or Points if needed */}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Standings;
