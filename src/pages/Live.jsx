import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Maximize, Trophy, Clock, Activity, X, Plus, Minus } from 'lucide-react';
import { useMatches } from '../hooks/useMatches';
import { usePlayers } from '../hooks/usePlayers';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from '../contexts/TournamentContext';
import { getBestOf, compareMatchIds, checkMatchStatus } from '../utils/matchUtils';
import { updateBracketMatch } from '../utils/bracketLogic';
import { getCountryCode } from '../constants/countries';
import './Live.css';

// ... (rest of imports)

// Helper Component for Score Controls
const ScoreControls = ({ onIncrement, onDecrement, size = 'normal', style = {} }) => {
    return (
        <div className={`score-controls ${size}`} style={style}>
            <button
                onClick={(e) => { e.stopPropagation(); onIncrement(); }}
                className="control-btn plus"
                title="Add Point"
            >
                <Plus size={size === 'small' ? 10 : 14} strokeWidth={3} />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onDecrement(); }}
                className="control-btn minus"
                title="Subtract Point"
            >
                <Minus size={size === 'small' ? 10 : 14} strokeWidth={3} />
            </button>
        </div>
    );
};


// Possible helper for flags...
// ... (rest of imports are fine, I will target specific chunks)

// I will target the imports first.


// Helper Component for Flag
const PlayerFlag = ({ countryCode }) => {
    if (!countryCode) return null;

    let code = countryCode;
    // Attempt to map full name to code if length > 2
    if (code.length > 2) {
        code = getCountryCode(code) || code;
    }

    // FlagCDN requires 2-letter codes (ISO 3166-1 alpha-2)
    // If we still don't have a 2-letter code, render nothing to avoid broken image icon
    if (!code || code.length !== 2) return null;

    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            alt={countryCode}
            className="player-flag"
            onError={(e) => { e.target.style.display = 'none'; }} // Fallback hiding
        />
    );
};

const splitName = (fullName) => {
    if (!fullName) return { surname: 'S.', firstName: 'Name' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) return { surname: fullName, firstName: '' };
    const firstName = parts.pop(); // Last word
    const surname = parts.join(' '); // Remaining words
    return { surname, firstName };
};

const Live = () => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const { saveMatches } = useMatches(); // Ensure saveMatches is destructured if not already

    const { matches } = useMatches();
    const { players } = usePlayers();

    // DEBUG LOG
    console.log("LIVE DATA CHECK:", matches);

    const { activeTournamentId, tournaments, isLoading: isTournamentLoading } = useTournament();
    const location = useLocation();
    const navigate = useNavigate();

    const activeTournament = tournaments.find(t => t.id === activeTournamentId);

    // TV Mode Detection
    const isTvMode = new URLSearchParams(location.search).get('mode') === 'tv';

    // State
    const [currentTime, setCurrentTime] = useState(new Date());
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    // Initial load timestamp & Force Update on matches change
    const [, forceUpdate] = useState(0);
    useEffect(() => {
        setLastUpdate(Date.now());
        forceUpdate(n => n + 1);
    }, [matches]);

    // Clock
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const toggleTvMode = () => {
        if (isTvMode) {
            navigate('/live');
        } else {
            navigate('/live?mode=tv');
        }
    };


    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const secondsAgo = Math.floor((Date.now() - lastUpdate) / 1000);

    // --- LOGIC CENTRAL (Reuse existing logic) ---
    const { pinkQueue, cyanQueue, finishedMatches } = useMemo(() => {
        if (!matches || matches.length === 0) {
            return { pinkQueue: [], cyanQueue: [], finishedMatches: [] };
        }

        // Enrich Match Objects
        const enriched = matches.map(m => {
            const p1 = players.find(p => p.id === m.player1Id);
            const p2 = players.find(p => p.id === m.player2Id);
            return {
                ...m,
                player1: p1 || { full_name: 'TBD', id: null, isBye: false },
                player2: p2 || { full_name: 'TBD', id: null, isBye: false }
            };
        });

        // Separate finished and active matches
        const finished = enriched.filter(m => m.winnerId);

        // Active matches: Live, Pending, Finished OR Scheduled
        const activeMatches = enriched.filter(m => {
            if (!m.status) return true;
            const s = m.status.toLowerCase();
            return s === 'live' || s === 'finished' || s === 'pending' || s === 'scheduled';
        })
            .sort((a, b) => {
                const sA = (a.status || '').toLowerCase();
                const sB = (b.status || '').toLowerCase();
                // Priority 1: Status 'live' comes first
                if (sA === 'live' && sB !== 'live') return -1;
                if (sA !== 'live' && sB === 'live') return 1;

                // Priority 2: Original ID order
                return compareMatchIds(a.id, b.id);
            });

        const pinkQ = [];
        const cyanQ = [];

        // Distribute Active Matches to Courts
        activeMatches.forEach((m, index) => {
            const matchOrder = index + 1;
            const court = matchOrder % 2 !== 0 ? 'courtPink' : 'courtCyan';
            const matchWithCourt = { ...m, assignedCourt: court, matchOrder };

            if (court === 'courtPink') pinkQ.push(matchWithCourt);
            else cyanQ.push(matchWithCourt);
        });

        const enrichedFinished = finished.map((m, i) => ({
            ...m, assignedCourt: i % 2 === 0 ? 'courtPink' : 'courtCyan'
        }));

        const recentFinished = enrichedFinished.reverse().slice(0, 4);
        return { pinkQueue: pinkQ, cyanQueue: cyanQ, finishedMatches: recentFinished };
    }, [matches, players]);

    const getCourtState = (queue) => {
        // Prefer a match that has started scoring or is explicitly set to live
        const liveMatch = queue.find(m => (m.score1 > 0 || m.score2 > 0 || (m.status && m.status.toLowerCase() === 'live')));
        const current = liveMatch || queue[0] || null;
        let upcoming = [];
        if (current) {
            const currentIdx = queue.findIndex(m => m.id === current.id);
            upcoming = queue.slice(currentIdx + 1, currentIdx + 4);
        }
        return { current, upcoming };
    };

    const pinkState = getCourtState(pinkQueue);
    const cyanState = getCourtState(cyanQueue);

    // Handlers for Live Scoring
    const handleLiveScoreUpdate = (match, type, playerKey, change, setIndex = null) => {
        if (!match) return;

        console.log(`[JUDGE] Update: ${type} ${playerKey} ${change}`);
        // DEBUG ALERT
        if (type === 'point' && !setIndex) window.alert(`Updating Score: ${playerKey} ${change}`);

        // 1. DEEP CLONE (Critical for React/Firestore references)
        let newScore1 = match.score1 ?? 0;
        let newScore2 = match.score2 ?? 0;
        // Deep clone array AND objects inside
        let newMicroPoints = (match.microPoints || []).map(s => ({ ...s }));

        if (type === 'set') {
            if (playerKey === 'score1') newScore1 += change;
            if (playerKey === 'score2') newScore2 += change;
        } else if (type === 'point') {
            // SMART LOGIC: Find target set or create one
            let targetSet;
            if (setIndex !== null) {
                targetSet = newMicroPoints.find(s => s.set === setIndex);
            } else {
                // If no index, find the last set (highest number) or create Set 1
                if (newMicroPoints.length === 0) {
                    newMicroPoints.push({ set: 1, a: 0, b: 0 });
                    targetSet = newMicroPoints[0];
                } else {
                    newMicroPoints.sort((a, b) => a.set - b.set);
                    targetSet = newMicroPoints[newMicroPoints.length - 1];
                }
            }

            if (targetSet) {
                const currentVal = targetSet[playerKey === 'a' ? 'a' : 'b'] || 0;
                const nextVal = Math.max(0, currentVal + change);

                if (playerKey === 'a') targetSet.a = nextVal;
                if (playerKey === 'b') targetSet.b = nextVal;
            }
        }

        // Validate Sets
        if (newScore1 < 0) newScore1 = 0;
        if (newScore2 < 0) newScore2 = 0;

        // Calc Status / Winner
        const bestOf = getBestOf(match.bracket);
        const winThreshold = Math.ceil(bestOf / 2);
        let status = 'live';
        let winnerId = null;

        if (newScore1 >= winThreshold) {
            status = 'finished';
            winnerId = match.player1.id;
        } else if (newScore2 >= winThreshold) {
            status = 'finished';
            winnerId = match.player2.id;
        }

        // Update Context
        const nextState = updateBracketMatch(
            matches,
            match.id,
            newScore1,
            newScore2,
            newMicroPoints,
            players,
            winnerId,
            status
        );

        saveMatches(nextState, match.id);
    };

    const renderLiveMatch = (match, courtColor) => {
        if (!match) return renderEmptyLive(courtColor);
        const bestOf = getBestOf(match.bracket);

        // Check Status using Helper
        const format = bestOf === 5 ? 'BO5' : 'BO3';
        const isStillPlaying = checkMatchStatus({ score1: match.score1, score2: match.score2 }, format);
        const showLive = isStillPlaying && !match.winnerId;

        // Prepare micro points (sets)
        const sets = match.microPoints || [];
        const sortedSets = [...sets].sort((a, b) => a.set - b.set);
        const currentSet = sortedSets.length > 0 ? sortedSets[sortedSets.length - 1] : null;

        const canAddSet = isAuthenticated && isStillPlaying && (sortedSets.length < bestOf);

        return (
            <div className="live-match-display" style={{ position: 'relative' }}>
                {showLive && (
                    <div style={{
                        background: '#ef4444', color: 'white', display: 'inline-block',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.5rem',
                        animation: 'pulse 2s infinite',
                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
                    }}>
                        {t('live.liveBadge') || "Live"}
                    </div>
                )}
                <div className="match-bracket-info">
                    {match.bracket === 'wb' ? t('live.wb') : match.bracket === 'lb' ? t('live.lb') : t('live.gf')} • {t('live.round')} {match.round} • BO{bestOf}
                </div>

                {/* JUDGE OVERLAY FOR SMART POINTS */}


                <div className="players-versus">
                    <div className="player-container left" style={{ color: match.score1 > match.score2 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        <div className="player-surname">
                            <PlayerFlag countryCode={match.player1.country} />
                            {splitName(match.player1.full_name).surname}
                        </div>
                        <div className="player-firstname">{splitName(match.player1.full_name).firstName}</div>
                        {/* Current Set Points Display */}
                        {isStillPlaying && (isAuthenticated || currentSet) && (
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '5px', color: courtColor }}>
                                {currentSet ? currentSet.a : 0}
                            </div>
                        )}
                    </div>

                    <div className="score-center-col" style={{ minWidth: '100px' }}>
                        <div className="score-display">

                            {/* Score 1 Controls (Sets) */}
                            {isAuthenticated && (
                                <ScoreControls
                                    onIncrement={() => handleLiveScoreUpdate(match, 'set', 'score1', 1)}
                                    onDecrement={() => handleLiveScoreUpdate(match, 'set', 'score1', -1)}
                                    style={{ marginRight: '8px' }}
                                    size="small"
                                />
                            )}

                            <span className="big-score" style={{
                                color: courtColor,
                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                display: 'inline-block'
                            }}>
                                {(match.winnerId || match.score1 > 0 || match.score2 > 0 || showLive) ? (match.score1 ?? 0) : '-'}
                            </span>
                            <span className="vs-divider"> : </span>
                            <span className="big-score" style={{
                                color: courtColor,
                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                display: 'inline-block'
                            }}>
                                {(match.winnerId || match.score1 > 0 || match.score2 > 0 || showLive) ? (match.score2 ?? 0) : '-'}
                            </span>

                            {/* Score 2 Controls (Sets) */}
                            {isAuthenticated && (
                                <ScoreControls
                                    onIncrement={() => handleLiveScoreUpdate(match, 'set', 'score2', 1)}
                                    onDecrement={() => handleLiveScoreUpdate(match, 'set', 'score2', -1)}
                                    style={{ marginLeft: '8px' }}
                                    size="small"
                                />
                            )}
                        </div>
                        {isAuthenticated && <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginTop: '-5px' }}>SETS</div>}
                    </div>

                    <div className="player-container right" style={{ color: match.score2 > match.score1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        <div className="player-surname">
                            <PlayerFlag countryCode={match.player2.country} />
                            {splitName(match.player2.full_name).surname}
                        </div>
                        <div className="player-firstname">{splitName(match.player2.full_name).firstName}</div>
                        {/* Current Set Points Display */}
                        {isStillPlaying && (isAuthenticated || currentSet) && (
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '5px', color: courtColor }}>
                                {currentSet ? currentSet.b : 0}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sets Display */}
                {(sortedSets.length > 0 || canAddSet) && (
                    <div className="sets-container">
                        {sortedSets.map((s, idx) => (
                            <div key={idx} className={`set-box ${idx === sortedSets.length - 1 ? 'active' : ''}`} style={{ animation: 'fadeIn 0.5s ease-out', position: 'relative', opacity: idx === sortedSets.length - 1 ? 1 : 0.6 }}>
                                <div className="set-label">SET {s.set}</div>
                                <div className="set-score" style={{ alignItems: 'center' }}>

                                    {isAuthenticated && (
                                        <div style={{ display: 'flex', flexDirection: 'column', marginRight: '4px' }}>
                                            <button className="tiny-btn" onClick={(e) => { e.stopPropagation(); handleLiveScoreUpdate(match, 'point', 'a', 1, s.set); }}>+</button>
                                            <button className="tiny-btn" onClick={(e) => { e.stopPropagation(); handleLiveScoreUpdate(match, 'point', 'a', -1, s.set); }}>-</button>
                                        </div>
                                    )}

                                    <span className={s.a > s.b ? 'set-winner' : ''}>{s.a}</span>
                                    <span style={{ margin: '0 2px' }}>:</span>
                                    <span className={s.b > s.a ? 'set-winner' : ''}>{s.b}</span>

                                    {isAuthenticated && (
                                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '4px' }}>
                                            <button className="tiny-btn" onClick={(e) => { e.stopPropagation(); handleLiveScoreUpdate(match, 'point', 'b', 1, s.set); }}>+</button>
                                            <button className="tiny-btn" onClick={(e) => { e.stopPropagation(); handleLiveScoreUpdate(match, 'point', 'b', -1, s.set); }}>-</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Add Set Button */}
                        {canAddSet && (
                            <button
                                className="add-set-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const nextSetNum = sortedSets.length + 1;
                                    const newMicro = [...(match.microPoints || []), { set: nextSetNum, a: 0, b: 0 }];
                                    const nextState = updateBracketMatch(matches, match.id, match.score1, match.score2, newMicro, players, match.winnerId, match.status);
                                    saveMatches(nextState, match.id);
                                }}
                            >
                                <Plus size={12} /> Set {sortedSets.length + 1}
                            </button>
                        )}
                    </div>
                )}
                {/* JUDGE OVERLAY FOR SMART POINTS (Fixed Z-Index & Position) */}
                {isAuthenticated && (
                    <div className="judge-overlay-controls" style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex', justifyContent: 'space-between', padding: '0 1rem', pointerEvents: 'none',
                        zIndex: 9999, alignItems: 'center'
                    }}>
                        {/* P1 Point */}
                        <button
                            className="judge-point-btn-large"
                            style={{ pointerEvents: 'auto', background: 'rgba(34, 197, 94, 0.4)', border: '2px solid rgba(255,255,255,0.8)', color: 'white', borderRadius: '50%', width: '80px', height: '80px', fontSize: '2rem', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(4px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log('Click P1'); handleLiveScoreUpdate(match, 'point', 'a', 1); }}
                            title="Add Point P1"
                        >
                            +
                        </button>
                        {/* P2 Point */}
                        <button
                            className="judge-point-btn-large"
                            style={{ pointerEvents: 'auto', background: 'rgba(34, 197, 94, 0.4)', border: '2px solid rgba(255,255,255,0.8)', color: 'white', borderRadius: '50%', width: '80px', height: '80px', fontSize: '2rem', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(4px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log('Click P2'); handleLiveScoreUpdate(match, 'point', 'b', 1); }}
                            title="Add Point P2"
                        >
                            +
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderUpcomingList = (matchesList, currentMatch) => {
        // Trigger Logic
        let showReadinessAlert = false;

        if (currentMatch && !currentMatch.winnerId) {
            const bestOf = getBestOf(currentMatch.bracket);
            const s1 = currentMatch.score1 || 0;
            const s2 = currentMatch.score2 || 0;

            if (bestOf === 3) {
                // BO3: Trigger if score is 1:0, 0:1 or 1:1 (i.e. someone has 1 set)
                if (s1 === 1 || s2 === 1) showReadinessAlert = true;
            } else {
                // BO5: Trigger if someone has 2 sets (2:0, 2:1, 2:2 etc)
                if (s1 === 2 || s2 === 2) showReadinessAlert = true;
            }
        }

        if (!matchesList || matchesList.length === 0) {
            return (
                <div className="upcoming-item empty">
                    {t('live.noUpcoming')}
                </div>
            );
        }
        return matchesList.map((match, idx) => {
            const isFirst = idx === 0;
            const alertActive = isFirst && showReadinessAlert;

            return (
                <div key={match.id} className={`upcoming-item-grid ${alertActive ? 'readiness-alert' : ''}`}>
                    {alertActive && (
                        <div className="alert-badge">
                            {t('live.readinessAlert')}
                        </div>
                    )}

                    {/* Grid Layout: P1 vs P2 | Meta */}
                    <div className="upcoming-match-content">
                        <div className="upcoming-player start">
                            <PlayerFlag countryCode={match.player1?.country} />
                            <span className="name-truncate">{match.player1?.full_name || 'TBD'}</span>
                        </div>

                        <div className="upcoming-vs">vs</div>

                        <div className="upcoming-player start">
                            <PlayerFlag countryCode={match.player2?.country} />
                            <span className="name-truncate">{match.player2?.full_name || 'TBD'}</span>
                        </div>
                    </div>

                    <div className="upcoming-meta-right">
                        {(match.bracket || '').toUpperCase()} R{match.round}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className={`live-container ${isTvMode ? 'tv-mode' : ''}`}>

            {/* TV Mode Controls */}
            {/* ... */}

            {/* Note: I need to update finishedMatches too. It's further down. */}
            {/* I will break this into two chunks if needed, or target specific lines. */}
            {/* The tool allows one large chunk replacement if contiguous, but these are separate functions. */}
            {/* Wait, renderUpcomingList is defined before return. finishedMatches is inside return. */}
            {/* I'll trigger separate replacements for safety or include enough context? */}
            {/* I'll replace renderUpcomingList first. */}

            {/* TV Mode Controls */}
            <div className="tv-controls" style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 10000 }}>
                {isTvMode ? (
                    <button onClick={(e) => { e.stopPropagation(); toggleTvMode(); }} className="btn-secondary" style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                        <X size={20} style={{ marginRight: '0.5rem' }} /> Exit TV
                    </button>
                ) : (
                    <button onClick={toggleTvMode} className="btn-primary">
                        <Maximize size={18} style={{ marginRight: '0.5rem' }} /> TV Mode
                    </button>
                )}
            </div>

            <header className="live-header" style={{ paddingRight: isTvMode ? '120px' : '0' }}>
                <div>
                    <h1 className="live-title">{t('live.title')}</h1>
                    {/* DEBUG INDICATOR */}
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                        Loaded: {matches.length} | ID: {activeTournamentId || 'None'} | {isTournamentLoading ? 'Loading...' : 'Ready'}
                    </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {/* Digital Clock */}
                    <div className="digital-clock">
                        {formatTime(currentTime)}
                    </div>

                    <div className="last-updated" style={{ justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                        <Activity size={14} />
                        {t('live.lastUpdate')} {secondsAgo < 5 ? t('live.justNow') : `${secondsAgo}${t('live.secondsAgo')}`}
                    </div>
                </div>
            </header>

            {/* View Layers Wrapper */}
            <div className="live-content-wrapper dashboard-grid">

                {/* LEFT COLUMN: ACTIVE COURTS */}
                <div className="dashboard-column main-column">
                    <div className="courts-container">
                        {/* 1. KORT RÓŻOWY */}
                        <div className="court-card compact glass-panel" style={{ borderLeft: '4px solid var(--accent-pink)' }}>
                            <div className="court-header-slim">
                                <span className="court-label" style={{ color: 'var(--accent-pink)' }}>{t('live.courtPink').toUpperCase()}</span>
                                {pinkState.current && (
                                    <span className="match-meta">
                                        {(pinkState.current.bracket || '').toUpperCase()} R{pinkState.current.round} • BO{getBestOf(pinkState.current.bracket)}
                                    </span>
                                )}
                            </div>
                            <div className="court-content-compact">
                                {renderLiveMatch(pinkState.current, 'var(--accent-pink)')}
                            </div>
                        </div>

                        {/* 2. KORT TURKUSOWY */}
                        <div className="court-card compact glass-panel" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
                            <div className="court-header-slim">
                                <span className="court-label" style={{ color: 'var(--accent-cyan)' }}>{t('live.courtCyan').toUpperCase()}</span>
                                {cyanState.current && (
                                    <span className="match-meta">
                                        {(cyanState.current.bracket || '').toUpperCase()} R{cyanState.current.round} • BO{getBestOf(cyanState.current.bracket)}
                                    </span>
                                )}
                            </div>
                            <div className="court-content-compact">
                                {renderLiveMatch(cyanState.current, 'var(--accent-cyan)')}
                            </div>
                        </div>
                    </div>

                    {/* RECENT RESULTS (Now Bigger & Below Courts) */}
                    <section className="recent-results-section glass-panel">
                        <h2 className="section-header-slim">
                            <Trophy size={16} style={{ marginRight: '8px', color: '#fbbf24' }} /> {t('live.recentResults').toUpperCase()}
                        </h2>
                        <div className="recent-list-clean">
                            {finishedMatches.length > 0 ? finishedMatches.map(match => (
                                <div key={match.id} className="recent-item-clean">
                                    <div className="recent-meta">
                                        <span className={`court-dot ${match.assignedCourt === 'courtPink' ? 'pink' : 'cyan'}`}></span>
                                        <span className="match-id">{(match.bracket || '').toUpperCase()} R{match.round}</span>
                                    </div>
                                    <div className="recent-players">
                                        <span className={match.winnerId === match.player1?.id ? 'winner' : ''}>
                                            {match.player1?.full_name}
                                        </span>
                                        <span className="vs">vs</span>
                                        <span className={match.winnerId === match.player2?.id ? 'winner' : ''}>
                                            {match.player2?.full_name}
                                        </span>
                                    </div>
                                    <div className="recent-score">
                                        {match.score1}:{match.score2}
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state">{t('live.noResults')}</div>
                            )}
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: UPCOMING MATCHES (Dedicated Panel) */}
                <div className="dashboard-column side-column">
                    <div className="upcoming-panel glass-panel">
                        <div className="panel-header">
                            <Clock size={16} /> {t('live.upcomingMatches').toUpperCase()}
                        </div>
                        <div className="upcoming-list-scroll">
                            <div className="upcoming-group">
                                <div className="group-label" style={{ color: 'var(--accent-pink)' }}>{t('live.courtPink')} Queue</div>
                                {renderUpcomingList(pinkState.upcoming, pinkState.current)}
                            </div>
                            <div className="divider-line"></div>
                            <div className="upcoming-group">
                                <div className="group-label" style={{ color: 'var(--accent-cyan)' }}>{t('live.courtCyan')} Queue</div>
                                {renderUpcomingList(cyanState.upcoming, cyanState.current)}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* QR Code Widget */}
            <div className="qr-widget">
                <div className="qr-box">
                    <img
                        src="/frame.png"
                        alt="Mobile Results"
                        className="qr-image"
                        onLoad={(e) => {
                            e.target.style.display = 'block';
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'none';
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    <div className="qr-placeholder" style={{ display: 'none' }}>
                        <div className="qr-placeholder-inner">
                            <span>SCAN</span>
                            <span>QR</span>
                        </div>
                    </div>
                </div>
                <div className="qr-label">{t('live.scanForResults')}</div>
            </div>
        </div>
    );
};

export default Live;
