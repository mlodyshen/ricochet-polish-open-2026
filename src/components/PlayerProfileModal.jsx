
import React, { useMemo } from 'react';
import { X, User, Trophy, Medal } from 'lucide-react';
import { getCountryCode } from '../constants/countries';

const PlayerProfileModal = ({ player, matches, allPlayers, onClose }) => {
    if (!player) return null;

    const playerMatches = useMemo(() => {
        if (!matches) return [];
        // Filter matches where player is involved
        const filtered = matches.filter(m =>
            m.player1Id === player.id || m.player2Id === player.id
        );

        // Enrich and Sort (latest first or by round logic)
        // We don't have timestamps, so we might assume order in array or round info.
        // Let's just map them first.
        return filtered.map(m => {
            const isP1 = m.player1Id === player.id;
            const opponentId = isP1 ? m.player2Id : m.player1Id;
            const opponent = allPlayers.find(p => p.id === opponentId) || { full_name: 'TBD' };

            const myScore = isP1 ? m.score1 : m.score2;
            const opScore = isP1 ? m.score2 : m.score1;

            // Determine result
            let result = 'pending';
            if (m.winnerId) {
                result = m.winnerId === player.id ? 'win' : 'loss';
            }

            return {
                ...m,
                opponent,
                myScore,
                opScore,
                result,
                isP1
            };
        }).reverse(); // Show last matches on top (assuming array order implies newer at end?) 
        // Actually matches generated are usually static order. 
        // Let's rely on standard display. 
        // Maybe sort by bracket? WB R1 -> WB R2. 
        // Let's just list them.
    }, [matches, player, allPlayers]);

    // Stats
    const stats = useMemo(() => {
        const played = playerMatches.filter(m => m.result !== 'pending');
        const wins = played.filter(m => m.result === 'win').length;
        const losses = played.filter(m => m.result === 'loss').length;
        return { wins, losses, played: played.length };
    }, [playerMatches]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-header-bg">
                    <button onClick={onClose} className="close-button light">
                        <X size={24} />
                    </button>
                    <div className="profile-hero">
                        <div className="profile-avatar-large">
                            {player.photo ? (
                                <img src={player.photo} alt={player.full_name} />
                            ) : (
                                <User size={48} />
                            )}
                        </div>
                        <div className="profile-info">
                            <h2 className="profile-name">{player.full_name}</h2>
                            <div className="profile-meta">
                                {player.country && (
                                    <div className="meta-item">
                                        {getCountryCode(player.country) && (
                                            <img
                                                src={`https://flagcdn.com/24x18/${getCountryCode(player.country)}.png`}
                                                alt={player.country}
                                            />
                                        )}
                                        <span>{player.country}</span>
                                    </div>
                                )}
                                {player.elo && (
                                    <div className="meta-item badge-elo">
                                        <Trophy size={14} />
                                        <span>POINTS {player.elo}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-body">
                    <div className="stats-row">
                        <div className="stat-card">
                            <span className="stat-value">{stats.played}</span>
                            <span className="stat-label">Mecze</span>
                        </div>
                        <div className="stat-card mobile-green">
                            <span className="stat-value">{stats.wins}</span>
                            <span className="stat-label">Wygrane</span>
                        </div>
                        <div className="stat-card mobile-red">
                            <span className="stat-value">{stats.losses}</span>
                            <span className="stat-label">Przegrane</span>
                        </div>
                    </div>

                    <h3 className="section-title-small">Historia Meczów</h3>

                    <div className="history-list">
                        {playerMatches.length > 0 ? (
                            playerMatches.map(match => (
                                <div key={match.id} className={`history-item ${match.result}`}>
                                    <div className="history-info">
                                        <div className="history-bracket">
                                            {(match.bracket || '').toUpperCase()} {match.round ? `R${match.round}` : ''}
                                        </div>
                                        <div className="history-opponent">
                                            <span style={{ color: 'var(--text-secondary)', marginRight: '4px' }}>vs</span>
                                            {match.opponent.full_name}
                                        </div>
                                    </div>

                                    <div className="history-score-box">
                                        <div className="main-score">
                                            <span className={match.result === 'win' ? 'score-win' : ''}>{match.myScore ?? 0}</span>
                                            <span>:</span>
                                            <span className={match.result === 'loss' ? 'score-loss' : ''}>{match.opScore ?? 0}</span>
                                        </div>
                                        {match.microPoints && match.microPoints.length > 0 && (
                                            <div className="sub-scores">
                                                {match.microPoints.sort((a, b) => a.set - b.set).map((mp, i) => {
                                                    // Need to flip if player is P2?
                                                    // mp is usually {set:1, a:?, b:?} where a=P1, b=P2
                                                    const valA = match.isP1 ? mp.a : mp.b;
                                                    const valB = match.isP1 ? mp.b : mp.a;
                                                    return (
                                                        <span key={i}>{valA}:{valB}{i < match.microPoints.length - 1 ? ',' : ''}</span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="result-badge">
                                        {match.result === 'win' && 'W'}
                                        {match.result === 'loss' && 'L'}
                                        {match.result === 'pending' && '-'}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-history">Brak rozegranych meczów na tym turnieju.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerProfileModal;
