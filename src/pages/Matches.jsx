import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatches } from '../hooks/useMatches';
import { useTournament } from '../contexts/TournamentContext';
import { updateBracketMatch, clearBracketMatch, generateDoubleEliminationBracket } from '../utils/bracketLogic';
import { getBestOf, getMatchStatus, canEditMatch, compareMatchIds } from '../utils/matchUtils';
import { Edit2, Trophy, Clock, Activity, CheckCircle, Save, X, Trash2 } from 'lucide-react';
import './Matches.css';
import { usePlayers } from '../hooks/usePlayers';
import { getCountryCode } from '../constants/countries';
import { useAuth } from '../hooks/useAuth.tsx';

// Helper Component for Flag
const PlayerFlag = ({ countryCode }) => {
    if (!countryCode) return null;
    let code = countryCode;
    if (code.length > 2) {
        code = getCountryCode(code) || code;
    }
    if (!code || code.length !== 2) return null;

    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            alt={countryCode}
            className="player-flag"
            onError={(e) => { e.target.style.display = 'none'; }}
        />
    );
};

const MatchEditModal = ({ match, onClose, onSave, onClear }) => {
    const bestOf = getBestOf(match.bracket);
    const winThreshold = Math.ceil(bestOf / 2);

    const [score1, setScore1] = useState(match.score1 || 0);
    const [score2, setScore2] = useState(match.score2 || 0);
    const [status, setStatus] = useState(match.winnerId ? 'finished' : 'live');
    const [court, setCourt] = useState(match.court || '');

    const [microPoints, setMicroPoints] = useState(match.microPoints || []);

    useEffect(() => {
        const s1 = parseInt(score1) || 0;
        const s2 = parseInt(score2) || 0;
        const totalSets = s1 + s2;

        setMicroPoints(prev => {
            if (prev.length === totalSets) return prev;
            const newPoints = [];
            for (let i = 1; i <= totalSets; i++) {
                const existing = prev.find(p => p.set === i);
                newPoints.push(existing || { set: i, a: 0, b: 0 });
            }
            return newPoints;
        });
    }, [score1, score2]);

    const handleMicroChange = (setNum, player, value) => {
        setMicroPoints(prev => prev.map(p => {
            if (p.set === setNum) {
                return { ...p, [player]: parseInt(value) || 0 };
            }
            return p;
        }));
    };

    // Ref for mount check to avoid initial save on render
    const isMounted = useRef(false);

    // Reusable Payload Generator
    const getSavePayload = () => {
        const s1 = parseInt(score1) || 0;
        const s2 = parseInt(score2) || 0;

        let finalStatus = status;
        let winnerId = match.winnerId;

        // Auto-detect finish condition (Strict)
        if (s1 >= winThreshold) {
            finalStatus = 'finished';
            winnerId = match.player1.id;
        } else if (s2 >= winThreshold) {
            finalStatus = 'finished';
            winnerId = match.player2.id;
        } else {
            // If manual status is finished but thresholds not met, try to infer winner or revert to live
            if (status === 'finished') {
                if (s1 > s2) winnerId = match.player1.id;
                else if (s2 > s1) winnerId = match.player2.id;
                else {
                    finalStatus = 'live';
                    winnerId = null;
                }
            } else {
                // PARTIAL SCORE LOGIC
                // If we have scores but not enough to win, it IS live.
                finalStatus = 'live';
                winnerId = null;
            }
        }

        return {
            score1: s1,
            score2: s2,
            microPoints: microPoints,
            forceFinished: finalStatus === 'finished',
            court: court,
            winnerId: winnerId
        };
    };

    // Use Ref for onSave to avoid stale closures in setTimeout
    const onSaveRef = useRef(onSave);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    // AGGRESSIVE AUTO-SAVE (DIRECT BYPASS - NO DEBOUNCE)
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }

        // Direct call without timeout
        onSaveRef.current(match.id, getSavePayload(), { autoSave: true });

    }, [score1, score2, microPoints, status, court]);

    const handleSave = (e) => {
        e.preventDefault();
        onSave(match.id, getSavePayload(), { autoSave: false });
    };

    const handleClear = () => {
        if (window.confirm("Are you sure? This will remove the result.")) {
            onClear(match.id);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px', maxWidth: '95%' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Edit Match Result</h2>
                    <button onClick={onClose} className="close-button"><X size={20} /></button>
                </div>

                <div style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Format: <strong>Best of {bestOf}</strong> (First to {winThreshold})
                </div>

                <form onSubmit={handleSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 10px 1fr', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                                {match.player1?.full_name || 'TBD'}
                            </div>
                        </div>
                        <div></div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                                {match.player2?.full_name || 'TBD'}
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <input
                                type="number" className="form-input" style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700 }}
                                min="0" max={winThreshold}
                                value={score1} onChange={e => setScore1(e.target.value)}
                            />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-secondary)', textAlign: 'center' }}>:</div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <input
                                type="number" className="form-input" style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700 }}
                                min="0" max={winThreshold}
                                value={score2} onChange={e => setScore2(e.target.value)}
                            />
                        </div>
                    </div>

                    {microPoints.length > 0 && (
                        <div style={{ marginBottom: '1.5rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Micro Points per Set</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {microPoints.map((mp, idx) => (
                                    <div key={mp.set} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8rem', width: '40px', color: 'var(--text-secondary)' }}>Set {mp.set}</span>
                                        <input
                                            type="number" className="form-input" style={{ textAlign: 'center', padding: '0.25rem' }}
                                            value={mp.a} onChange={e => handleMicroChange(mp.set, 'a', e.target.value)}
                                            placeholder="A"
                                        />
                                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                                        <input
                                            type="number" className="form-input" style={{ textAlign: 'center', padding: '0.25rem' }}
                                            value={mp.b} onChange={e => handleMicroChange(mp.set, 'b', e.target.value)}
                                            placeholder="B"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Match Status</label>
                        <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="live">Live (Playing)</option>
                            <option value="finished">Finished (Final Result)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Court Assignment</label>
                        <select className="form-input" value={court} onChange={e => setCourt(e.target.value)}>
                            <option value="">-- No Court --</option>
                            <option value="Kort Różowy">Kort Różowy</option>
                            <option value="Kort Turkusowy">Kort Turkusowy</option>
                        </select>
                    </div>

                    <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                        {match.winnerId ? (
                            <button type="button" onClick={handleClear} className="btn-secondary" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                                <Trash2 size={16} /> Reset
                            </button>
                        ) : <div></div>}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                            <button type="submit" className="btn-primary">
                                <Save size={16} /> Save Score
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Matches = () => {
    const { t } = useTranslation();
    const { matches, saveMatches } = useMatches();
    const { players } = usePlayers();
    const { activeTournamentId, updateTournament } = useTournament();
    const [filter, setFilter] = useState('all');
    const [editingMatch, setEditingMatch] = useState(null);
    const { isAuthenticated } = useAuth();

    const processedMatches = useMemo(() => {
        if (!matches || matches.length === 0) return { current: null, pending: [], finished: [] };

        // 1. Enrich Matches with Player Data
        const enriched = matches.map(m => {
            const p1 = players.find(p => p.id === m.player1Id);
            const p2 = players.find(p => p.id === m.player2Id);
            return {
                ...m,
                player1: p1 || { full_name: 'TBD', id: null, isBye: false },
                player2: p2 || { full_name: 'TBD', id: null, isBye: false },
                status: getMatchStatus({
                    ...m,
                    winner_id: m.winnerId,
                    player1: p1 || { id: null },
                    player2: p2 || { id: null }
                }),
                canEdit: (p1 && p2 && !p1.isBye && !p2.isBye)
            };
        }).filter(m => m.player1Id && m.player2Id && !m.player1.isBye && !m.player2.isBye);

        const liveMatches = enriched.filter(m => m.status === 'live');
        // Sort pending matches by ID so they appear in logical bracket order (e.g. WB R1 M1, M2...)
        const pendingMatches = enriched.filter(m => m.status === 'pending').sort((a, b) => compareMatchIds(a.id, b.id));
        const doneMatches = enriched.filter(m => m.status === 'finished');

        let current = null;
        let pending = [];
        let finished = doneMatches.reverse();

        if (liveMatches.length > 0) {
            current = liveMatches[0];
            pending = [...liveMatches.slice(1), ...pendingMatches];
        } else if (pendingMatches.length > 0) {
            current = pendingMatches[0];
            pending = pendingMatches.slice(1);
        }

        return { current, pending, finished, all: [...pending, ...finished] };
    }, [matches, players]);

    const handleSaveScore = (matchId, data, options = {}) => {
        // Update local state is tricky because useMatches holds raw data.
        // We calculate next state using util.
        const status = data.forceFinished ? 'finished' : 'live';
        const newState = updateBracketMatch(matches, matchId, data.score1, data.score2, data.microPoints, players, data.winnerId, status);

        // Also update court manually if needed since bracket logic might not track it?
        // BracketLogic focuses on bracket progression. Court is metadata.
        // We should merge court info back.
        const finalState = newState.map(m => {
            if (m.id === matchId) return { ...m, court: data.court };
            // Persist existing court info for others
            const old = matches.find(oldM => oldM.id === m.id);
            return { ...m, court: old?.court || m.court };
        });

        console.log("Próba zapisu meczu:", matchId, data);
        saveMatches(finalState, matchId); // Pass matchId for targeted saving
        console.log("Zapis wysłany do hooka!");

        // Close modal only if manual save
        if (!options.autoSave) {
            setEditingMatch(null);
        }
    };

    const handleClearScore = (matchId) => {
        const resetMatches = clearBracketMatch(matches, matchId, players);
        saveMatches(resetMatches);
        setEditingMatch(null);
    };

    const renderMatchCard = (match, isCompact = false, index = 0) => {
        if (!match) return null;
        const isWB = match.bracket === 'wb';
        const isGF = match.bracket === 'gf';
        const bracketLabel = isGF ? t('brackets.finals') : (isWB ? t('brackets.wb') : t('brackets.lb'));
        const roundLabel = match.round ? `${t('brackets.round')} ${match.round}` : '';
        const bestOf = getBestOf(match.bracket);
        const accentColor = index % 2 === 0 ? 'var(--accent-pink)' : 'var(--accent-cyan)';

        return (
            <div key={match.id} className={isCompact ? "finished-item" : "match-card"} style={{ '--accent-primary': accentColor }}>
                {!isCompact && (
                    <div className="match-meta">
                        <div>
                            <span className="match-type" style={{ color: accentColor, fontWeight: 700 }}>{bracketLabel}</span>
                            <span style={{ margin: '0 0.5rem' }}>•</span>
                            <span>{roundLabel}</span>
                            <span style={{ margin: '0 0.5rem' }}>•</span>
                            <span>{t('matches.match', { id: match.id.split('-m')[1] })}</span>
                        </div>
                        <div className={`match-status status-${match.status}`}>
                            {match.court && <span style={{ marginRight: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{match.court} | </span>}
                            {match.status} • BO{bestOf}
                        </div>
                    </div>
                )}

                <div className="match-teams" style={isCompact ? { flex: 1 } : {}}>
                    <div className={`team-row ${match.winnerId === match.player1.id ? 'winner' : ''}`}>
                        <span className="team-name" title={match.player1.full_name}>
                            <PlayerFlag countryCode={match.player1.country} /> {match.player1.full_name}
                        </span>
                        <span className="team-score">{match.score1 ?? 0}</span>
                    </div>

                    <span className="vs-separator">vs</span>

                    <div className={`team-row ${match.winnerId === match.player2.id ? 'winner' : ''}`}>
                        <span className="team-score">{match.score2 ?? 0}</span>
                        <span className="team-name" title={match.player2.full_name}>
                            <PlayerFlag countryCode={match.player2.country} /> {match.player2.full_name}
                        </span>
                    </div>

                    {isCompact && (
                        <div style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {bracketLabel} {roundLabel}
                        </div>
                    )}
                </div>

                {match.microPoints && match.microPoints.length > 0 && (
                    <div style={{
                        marginTop: isCompact ? '0' : '0.5rem',
                        marginLeft: isCompact ? '1rem' : '0',
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                        display: 'flex',
                        gap: '0.25rem',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                    }}>
                        {match.microPoints.sort((a, b) => a.set - b.set).map((mp, i) => (
                            <span key={i}>
                                {mp.a}:{mp.b}{i < match.microPoints.length - 1 ? ',' : ''}
                            </span>
                        ))}
                    </div>
                )}

                {isCompact && isAuthenticated && (
                    <div style={{ marginLeft: '1rem' }}>
                        <button
                            className="edit-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingMatch(match);
                            }}
                            style={{
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-secondary)',
                                padding: '0.4rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title={t('common.edit')}
                        >
                            <Edit2 size={16} />
                        </button>
                    </div>
                )}

                {!isCompact && isAuthenticated && (
                    <div className="match-footer" style={{ marginTop: '0.5rem' }}>
                        <div></div>
                        <button className="edit-btn" onClick={() => setEditingMatch(match)} style={{ borderColor: accentColor, color: accentColor }}>
                            <Edit2 size={14} /> {t('common.edit')}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (!matches || matches.length === 0) {
        return (
            <div className="matches-container animate-fade-in">
                <div className="empty-matches">
                    <h2>{t('matches.noActiveMatches')}</h2>
                    <p>{t('matches.generatePrompt')}</p>
                    {isAuthenticated && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>
                                Zarejestrowanych graczy: <strong>{players.length}</strong>
                            </p>
                            <button
                                onClick={async () => {
                                    if (players.length < 2) {
                                        alert(t('matches.needPlayers'));
                                        return;
                                    }
                                    if (window.confirm(t('matches.generateConfirm', { count: players.length }))) {
                                        const newBracket = generateDoubleEliminationBracket(players);
                                        await saveMatches(newBracket);
                                        if (activeTournamentId) {
                                            await updateTournament(activeTournamentId, { status: 'in_progress' });
                                        }
                                    }
                                }}
                                className="btn-primary"
                            >
                                <Trophy size={18} style={{ marginRight: '0.5rem' }} />
                                {t('matches.generateBtn')}
                            </button>
                        </div>
                    )}
                    {!isAuthenticated && (
                        <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>{t('matches.loginPrompt')}</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="matches-container animate-fade-in">
            <div className="matches-header">
                <h1 className="matches-title text-gradient">{t('matches.title')}</h1>
                <div className="matches-filters">
                    <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>{t('matches.filters.all')}</button>
                    <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>{t('matches.filters.pending')}</button>
                    <button className={`filter-btn ${filter === 'finished' ? 'active' : ''}`} onClick={() => setFilter('finished')}>{t('matches.filters.finished')}</button>
                </div>
            </div>

            {/* 1. Current Match Section */}
            {processedMatches.current && (filter === 'all' || filter === 'pending' || filter === 'live') && (
                <section>
                    <div className="section-header text-gradient">
                        <Activity size={20} /> {t('matches.currentMatch')}
                    </div>
                    {/* Force Pink for Current Match Highlight */}
                    <div className="current-match-card" style={{ '--accent-primary': 'var(--accent-pink)' }}>
                        <div className="current-match-badge" style={{ background: 'var(--accent-pink)' }}>LIVE / UP NEXT</div>
                        <div style={{ opacity: 0.9 }}>
                            {renderMatchCard(processedMatches.current, false, 0)}
                        </div>
                    </div>
                </section>
            )}

            {/* 2. Pending Matches Grid */}
            {(processedMatches.pending.length > 0) && (filter === 'all' || filter === 'pending') && (
                <section>
                    <div className="section-header">
                        <Clock size={20} /> {t('matches.nextMatches')}
                    </div>
                    <div className="matches-grid">
                        {processedMatches.pending.map((m, i) => renderMatchCard(m, false, i))}
                    </div>
                </section>
            )}

            {/* 3. Finished Matches List */}
            {(processedMatches.finished.length > 0) && (filter === 'all' || filter === 'finished') && (
                <section>
                    <div className="section-header">
                        <CheckCircle size={20} /> {t('matches.played')}
                    </div>
                    <div className="finished-list">
                        {processedMatches.finished.map((m, i) => renderMatchCard(m, true, i))}
                    </div>
                </section>
            )}

            {(processedMatches.pending.length === 0 && processedMatches.finished.length === 0 && !processedMatches.current) && (
                <div className="empty-matches">{t('matches.allFinished')}</div>
            )}

            {editingMatch && (
                <MatchEditModal
                    match={editingMatch}
                    onClose={() => setEditingMatch(null)}
                    onSave={handleSaveScore}
                    onClear={handleClearScore}
                />
            )}
        </div>
    );
};

export default Matches;
