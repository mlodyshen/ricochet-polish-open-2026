
import React, { useMemo } from 'react';
import { useMatches } from '../hooks/useMatches';
import { usePlayers } from '../hooks/usePlayers';
import { Trophy, Medal, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCountryCode } from '../constants/countries';
import './Standings.css';

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

    const top3 = standingsData.slice(0, 3);
    const rest = standingsData.slice(3);

    const renderPodiumSpot = (index) => {
        const rank = index + 1;
        const slot = top3[index];
        const player = slot ? getPlayer(slot.playerId) : null;

        return (
            <div key={rank} className={`podium-spot rank-${rank}`}>
                <div className="podium-avatar-wrapper">
                    {player?.photo ? (
                        <img src={player.photo} alt={player?.full_name} className="podium-avatar" />
                    ) : (
                        <div className="podium-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={rank === 1 ? 64 : 48} color="var(--text-tertiary)" />
                        </div>
                    )}
                    <div className="rank-badge">{rank}</div>
                </div>
                <div className="podium-info">
                    <div className="podium-name" title={player?.full_name}>
                        {player ? player.full_name : <span className="empty-slot-text">&nbsp;</span>}
                    </div>
                    {player && player.country && (
                        <div className="podium-country">
                            {getCountryCode(player.country) && (
                                <img
                                    src={`https://flagcdn.com/20x15/${getCountryCode(player.country)}.png`}
                                    alt={player.country}
                                    style={{ borderRadius: '2px' }}
                                />
                            )}
                            {player.country}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="standings-container fade-in">
            <div className="standings-header">
                <h1 className="standings-title text-gradient">{t('navigation.standings')}</h1>
            </div>

            <div className="podium-section">
                {renderPodiumSpot(1)} {/* Silver (Left) */}
                {renderPodiumSpot(0)} {/* Gold (Center) - Logic handles order via CSS order property or layout */}
                {renderPodiumSpot(2)} {/* Bronze (Right) */}
            </div>

            <div className="standings-list-container">
                {rest.map((slot, i) => {
                    const rank = i + 4;
                    const player = slot ? getPlayer(slot.playerId) : null;
                    return (
                        <div key={rank} className="standings-row">
                            <div className="row-rank">{rank}</div>
                            {player?.photo ? (
                                <img src={player.photo} alt={player?.full_name} className="row-avatar" />
                            ) : (
                                <div className="row-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)' }}>
                                    <User size={20} color="var(--text-secondary)" />
                                </div>
                            )}
                            <div className="row-info">
                                <div className="row-name">
                                    {player ? player.full_name : <span className="empty-slot-text">&nbsp;</span>}
                                </div>
                                {player && player.country && (
                                    <div className="row-country">
                                        {getCountryCode(player.country) && (
                                            <img
                                                src={`https://flagcdn.com/16x12/${getCountryCode(player.country)}.png`}
                                                alt={player.country}
                                            />
                                        )}
                                        {player.country}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Standings;
