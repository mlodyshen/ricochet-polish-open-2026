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
    const { t } = useTranslation();
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

    // AGGRESSIVE AUTO-SAVE WITH DEBOUNCE (500ms)
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }

        const timer = setTimeout(() => {
            onSaveRef.current(match.id, getSavePayload(), { autoSave: true });
        }, 500);

        return () => clearTimeout(timer);
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
                    <h2 className="modal-title">{t('matches.editResultTitle')}</h2>
                    <button onClick={onClose} className="close-button"><X size={20} /></button>
                </div>

                <div style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {t('matches.formatInfo', { n: winThreshold, bo: bestOf })}
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
                        <label className="form-label">{t('matches.statusLabel')}</label>
                        <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="live">Live (Playing)</option>
                            <option value="finished">Finished (Final Result)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('matches.courtLabel')}</label>
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
        if (!matches || matches.length === 0) return { active: [], pending: [], finished: [] };

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

        // 2. Filter by Status
        // Explicitly check for 'live' status from the data or inferred
        const active = enriched.filter(m => m.status === 'live');

        // Sort pending matches by ID
        const pending = enriched.filter(m => m.status === 'pending').sort((a, b) => compareMatchIds(a.id, b.id));

        const finished = enriched.filter(m => m.status === 'finished').reverse();

        return { active, pending, finished };
    }, [matches, players]);

    const handleSaveScore = (matchId, data, options = {}) => {
        const status = data.forceFinished ? 'finished' : 'live';
        const newState = updateBracketMatch(matches, matchId, data.score1, data.score2, data.microPoints, players, data.winnerId, status);

        const finalState = newState.map(m => {
            if (m.id === matchId) return { ...m, court: data.court };
            const old = matches.find(oldM => oldM.id === m.id);
            return { ...m, court: old?.court || m.court };
        });

        saveMatches(finalState, matchId);

        if (!options.autoSave) {
            setEditingMatch(null);
        }
    };

    const handleClearScore = (matchId) => {
        const resetMatches = clearBracketMatch(matches, matchId, players);
        saveMatches(resetMatches);
        setEditingMatch(null);
    };

    // --- RENDERERS ---

    const renderActiveMatch = (match, index) => {
        const cUpper = (match.court || '').toUpperCase();
        const isPink = cUpper.includes('RÓŻOWY') || cUpper.includes('LEWY') || cUpper.includes('LEFT') || cUpper.includes('PINK') || (!match.court && index % 2 === 0);
        const accentColor = isPink ? 'var(--accent-pink)' : 'var(--accent-cyan)';

        return (
            <div key={match.id} className="active-match-card" style={{ '--accent-color': accentColor }}>
                <div className="active-match-header">
                    <span style={{ color: accentColor }}>{match.court || (isPink ? t('live.courtPinkLabel') : t('live.courtCyanLabel'))}</span>
                    <span className="live-badge">{t('live.liveBadge')}</span>
                </div>

                <div className="active-score-board">
                    <div className="active-player left">
                        <PlayerFlag countryCode={match.player1.country} />
                        <span className="active-player-name">{match.player1.full_name}</span>
                    </div>
                    <div className="active-set-score">{match.score1 ?? 0}</div>
                    <div className="vs-divider">:</div>
                    <div className="active-set-score">{match.score2 ?? 0}</div>
                    <div className="active-player right">
                        <PlayerFlag countryCode={match.player2.country} />
                        <span className="active-player-name">{match.player2.full_name}</span>
                    </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.6 }}>
                    {(match.bracket || '').toUpperCase()} ROUND {match.round} • MATCH {match.id.split('-m')[1]}
                </div>

                {isAuthenticated && (
                    <div className="active-actions">
                        <button className="edit-btn" onClick={() => setEditingMatch(match)} style={{ borderColor: accentColor, color: accentColor }}>
                            <Edit2 size={16} style={{ marginRight: '6px' }} /> {t('matches.controlMatch')}
                        </button>
                    </div>

                )}
            </div>
        );
    };

    const renderMatchRow = (match, index, forcedColor = null) => {
        const isWB = match.bracket === 'wb';
        const isGF = match.bracket === 'gf';
        const bracketClass = isGF ? 'gf' : (isWB ? 'wb' : 'lb');
        const bracketLabel = isGF ? t('matches.bracketFinal') : (isWB ? t('matches.bracketWinners') : t('matches.bracketLosers'));

        // Determine court color (predictive or assigned)
        let colorType = forcedColor;
        if (!colorType) {
            const cUpper = (match.court || '').toUpperCase();
            if (cUpper.includes('RÓŻOWY') || cUpper.includes('LEWY') || cUpper.includes('LEFT') || cUpper.includes('PINK')) colorType = 'pink';
            else if (cUpper.includes('TURKUSOWY') || cUpper.includes('PRAWY') || cUpper.includes('RIGHT') || cUpper.includes('CYAN')) colorType = 'cyan';
            else colorType = index % 2 === 0 ? 'pink' : 'cyan';
        }

        const rowBorderColor = colorType === 'pink' ? 'var(--accent-pink)' : 'var(--accent-cyan)';

        return (
            <div key={match.id} className="match-list-row" style={{ borderLeft: `4px solid ${rowBorderColor}` }}>
                <div className="row-id" style={{ color: rowBorderColor }}>#{match.id.split('-m')[1]}</div>
                <div className="row-bracket">
                    <span className={`bracket-badge ${bracketClass}`}>{bracketLabel}</span>
                    <span style={{ opacity: 0.5 }}>R{match.round}</span>
                    {(() => {
                        let courtBadge = null;
                        if (match.court) {
                            const cUpper = match.court.toUpperCase();
                            const isPink = cUpper.includes('RÓŻOWY') || cUpper.includes('LEWY') || cUpper.includes('LEFT') || cUpper.includes('PINK');
                            const isCyan = cUpper.includes('TURKUSOWY') || cUpper.includes('PRAWY') || cUpper.includes('RIGHT') || cUpper.includes('CYAN');
                            const courtName = isPink ? 'LEFT' : (isCyan ? 'RIGHT' : 'CRT');
                            const badgeStyle = {
                                fontSize: '0.65rem',
                                fontWeight: '800',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                marginLeft: '6px',
                                backgroundColor: isPink ? 'rgba(236, 72, 153, 0.15)' : (isCyan ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.1)'),
                                color: isPink ? 'var(--accent-pink)' : (isCyan ? 'var(--accent-cyan)' : 'var(--text-secondary)'),
                                border: `1px solid ${isPink ? 'var(--accent-pink)' : (isCyan ? 'var(--accent-cyan)' : 'var(--border-color)')}`,
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                                lineHeight: '1'
                            };
                            return <span style={badgeStyle} title={match.court}>{courtName}</span>;
                        }
                        return null;
                    })()}
                </div>

                <div className="row-players">
                    <div className="list-player p1">
                        <span>{match.player1.full_name}</span>
                        <PlayerFlag countryCode={match.player1.country} />
                    </div>
                    {match.status === 'finished' ? (
                        <div className="list-score">{match.score1} : {match.score2}</div>
                    ) : (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>vs</div>
                    )}
                    <div className="list-player p2">
                        <PlayerFlag countryCode={match.player2.country} />
                        <span>{match.player2.full_name}</span>
                    </div>
                </div>

                <div className="row-action">
                    {isAuthenticated && (
                        <button className="edit-icon-btn" onClick={() => setEditingMatch(match)} title="Edit">
                            <Edit2 size={16} />
                        </button>
                    )}
                </div>
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
                                {t('matches.registeredPlayers')}: <strong>{players.length}</strong>
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

            {/* 1. Live Arena */}
            {(processedMatches.active.length > 0) && (filter === 'all' || filter === 'pending') && (
                <section>
                    <div className="section-header">
                        <Activity size={20} color="#ef4444" /> {t('matches.liveArena')}
                    </div>
                    <div className="active-matches-grid">
                        {processedMatches.active.map((m, i) => renderActiveMatch(m, i))}
                    </div>
                </section>
            )}

            {/* 2. Upcoming / Pending List - COLUMNS */}
            {(processedMatches.pending.length > 0) && (filter === 'all' || filter === 'pending') && (
                <section>
                    <div className="section-header">
                        <Clock size={20} /> {t('matches.nextMatches')}
                    </div>

                    {/* Logic to split pending into Pink and Cyan queues */}
                    {(() => {
                        const pinkQueue = [];
                        const cyanQueue = [];

                        processedMatches.pending.forEach((m, idx) => {
                            const cUpper = (m.court || '').toUpperCase();
                            const isPink = cUpper.includes('RÓŻOWY') || cUpper.includes('LEWY') || cUpper.includes('LEFT') || cUpper.includes('PINK');
                            const isCyan = cUpper.includes('TURKUSOWY') || cUpper.includes('PRAWY') || cUpper.includes('RIGHT') || cUpper.includes('CYAN');

                            if (isPink) {
                                pinkQueue.push(m);
                            } else if (isCyan) {
                                cyanQueue.push(m);
                            } else {
                                // Default distribution if no court assigned (Alternating)
                                if (idx % 2 === 0) pinkQueue.push(m);
                                else cyanQueue.push(m);
                            }
                        });

                        return (
                            <div className="queue-columns">
                                {/* PINK COLUMN */}
                                <div className="queue-column">
                                    <h3 style={{ color: 'var(--accent-pink)', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', paddingLeft: '0.5rem', borderLeft: '3px solid var(--accent-pink)' }}>
                                        {t('live.pinkQueue')}
                                    </h3>
                                    {pinkQueue.length === 0 && <div className="empty-state-text" style={{ padding: '1rem', fontSize: '0.8rem' }}>Default queue empty</div>}
                                    {pinkQueue.map((m, idx) => renderMatchRow(m, idx, 'pink'))}
                                </div>

                                {/* CYAN COLUMN */}
                                <div className="queue-column">
                                    <h3 style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', paddingLeft: '0.5rem', borderLeft: '3px solid var(--accent-cyan)' }}>
                                        {t('live.cyanQueue')}
                                    </h3>
                                    {cyanQueue.length === 0 && <div className="empty-state-text" style={{ padding: '1rem', fontSize: '0.8rem' }}>Default queue empty</div>}
                                    {cyanQueue.map((m, idx) => renderMatchRow(m, idx, 'cyan'))}
                                </div>
                            </div>
                        );
                    })()}
                </section>
            )}

            {/* 3. Finished Matches List */}
            {(processedMatches.finished.length > 0) && (filter === 'all' || filter === 'finished') && (
                <section>
                    <div className="section-header">
                        <CheckCircle size={20} color="#10b981" /> {t('matches.played')}
                    </div>
                    <div className="match-list-container">
                        {processedMatches.finished.map(m => renderMatchRow(m))}
                    </div>
                </section>
            )}

            {(processedMatches.active.length === 0 && processedMatches.pending.length === 0 && processedMatches.finished.length === 0) && (
                <div className="empty-state-text">{t('matches.allFinished')}</div>
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
