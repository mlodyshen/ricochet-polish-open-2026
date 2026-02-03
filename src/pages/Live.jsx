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

// Helper Component for Flag
const PlayerFlag = ({ countryCode }) => {
    if (!countryCode) return null;
    let code = countryCode.length > 2 ? (getCountryCode(countryCode) || countryCode) : countryCode;
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

const splitName = (fullName) => {
    if (!fullName) return { surname: 'S.', firstName: 'Name' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) return { surname: fullName, firstName: '' };
    const firstName = parts.pop();
    const surname = parts.join(' ');
    return { surname, firstName };
};

const Live = () => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const { matches, saveMatches } = useMatches(); // Ensuring saveMatches exists here
    const { players } = usePlayers();
    const { activeTournamentId, tournaments, isLoading: isTournamentLoading } = useTournament();

    // Safety check for critical data
    const safeMatches = Array.isArray(matches) ? matches : [];

    const location = useLocation();
    const navigate = useNavigate();
    const isTvMode = new URLSearchParams(location.search).get('mode') === 'tv';
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const toggleTvMode = () => navigate(isTvMode ? '/live' : '/live?mode=tv');
    const formatTime = (date) => date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // --- LOGIC CENTRAL ---
    const { pinkQueue, cyanQueue, finishedMatches } = useMemo(() => {
        if (!safeMatches.length) return { pinkQueue: [], cyanQueue: [], finishedMatches: [] };

        const enriched = safeMatches.map(m => ({
            ...m,
            player1: players.find(p => p.id === m.player1Id) || { full_name: 'TBD', id: null },
            player2: players.find(p => p.id === m.player2Id) || { full_name: 'TBD', id: null }
        }));

        const finished = enriched.filter(m => m.winnerId);
        const activeMatches = enriched.filter(m => {
            if (!m.status) return true;
            const s = m.status.toLowerCase();
            return ['live', 'finished', 'pending', 'scheduled'].includes(s);
        }).sort((a, b) => {
            const sA = (a.status || '').toLowerCase();
            const sB = (b.status || '').toLowerCase();
            if (sA === 'live' && sB !== 'live') return -1;
            if (sA !== 'live' && sB === 'live') return 1;
            return compareMatchIds(a.id, b.id);
        });

        const pinkQ = [], cyanQ = [];
        activeMatches.forEach((m, index) => {
            const court = (index + 1) % 2 !== 0 ? 'courtPink' : 'courtCyan';
            const mWithCourt = { ...m, assignedCourt: court };
            if (court === 'courtPink') pinkQ.push(mWithCourt); else cyanQ.push(mWithCourt);
        });

        const enrichedFinished = finished.map((m, i) => ({ ...m, assignedCourt: i % 2 === 0 ? 'courtPink' : 'courtCyan' }));
        return { pinkQueue: pinkQ, cyanQueue: cyanQ, finishedMatches: enrichedFinished.reverse().slice(0, 4) };
    }, [safeMatches, players]);

    const getCourtState = (queue) => {
        const liveMatch = queue.find(m => (m.score1 > 0 || m.score2 > 0 || (m.status && m.status.toLowerCase() === 'live')));
        const current = liveMatch || queue[0] || null;
        const upcoming = current ? queue.slice(queue.findIndex(m => m.id === current.id) + 1, queue.findIndex(m => m.id === current.id) + 4) : [];
        return { current, upcoming };
    };

    const pinkState = getCourtState(pinkQueue);
    const cyanState = getCourtState(cyanQueue);

    // --- SCORE HANDLER ---
    const handleUpdate = (match, type, playerKey, change) => {
        if (!match || !isAuthenticated) return;

        console.log(`[JUDGE] Update: ${match.id} | ${type} | ${playerKey} | ${change}`);

        // Deep Clone
        let newScore1 = match.score1 ?? 0;
        let newScore2 = match.score2 ?? 0;
        let newMicroPoints = (match.microPoints || []).map(s => ({ ...s }));

        if (type === 'set') {
            if (playerKey === 'score1') newScore1 += change;
            if (playerKey === 'score2') newScore2 += change;
        } else if (type === 'point') {
            // Logic to find current set or create one
            let targetSet = newMicroPoints.length ? newMicroPoints[newMicroPoints.length - 1] : { set: 1, a: 0, b: 0 };

            // If it's a new empty set being created implicitely (should use 'Add Set' button strictly but fallback here)
            if (newMicroPoints.length === 0) newMicroPoints.push(targetSet);

            const nextVal = Math.max(0, (targetSet[playerKey === 'a' ? 'a' : 'b'] || 0) + change);
            if (playerKey === 'a') targetSet.a = nextVal;
            if (playerKey === 'b') targetSet.b = nextVal;
        }

        // Constraints
        newScore1 = Math.max(0, newScore1);
        newScore2 = Math.max(0, newScore2);

        // Status Check
        const bestOf = getBestOf(match.bracket);
        const winThreshold = Math.ceil(bestOf / 2);
        let status = 'live';
        let winnerId = null;

        if (newScore1 >= winThreshold) { status = 'finished'; winnerId = match.player1.id; }
        else if (newScore2 >= winThreshold) { status = 'finished'; winnerId = match.player2.id; }

        const nextState = updateBracketMatch(safeMatches, match.id, newScore1, newScore2, newMicroPoints, players, winnerId, status);
        saveMatches(nextState, match.id);
    };

    // --- RENDER HELPERS ---
    const btnStyle = (color) => ({
        background: 'rgba(255,255,255,0.1)',
        border: `1px solid ${color || 'white'}`,
        color: color || 'white',
        borderRadius: '4px',
        width: '28px', height: '28px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 4px',
        pointerEvents: 'auto', zIndex: 99999, position: 'relative'
    });

    const renderEmptyLive = (courtColor) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', opacity: 0.5, fontStyle: 'italic', color: courtColor }}>
            {t('live.waitingForMatch') || "Waiting..."}
        </div>
    );

    const renderLiveMatch = (match, courtColor) => {
        if (!match) return renderEmptyLive(courtColor);
        const bestOf = getBestOf(match.bracket);
        const isStillPlaying = checkMatchStatus({ score1: match.score1, score2: match.score2 }, bestOf === 5 ? 'BO5' : 'BO3') && !match.winnerId;
        const currentSet = (match.microPoints || []).slice(-1)[0] || null;

        return (
            <div style={{ position: 'relative', padding: '1rem' }}>
                {isStillPlaying && <div className="live-badge">LIVE</div>}

                {/* Match Info */}
                <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                    {(match.bracket || '').toUpperCase()} R{match.round} • BO{bestOf}
                </div>

                <div className="players-versus" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    {/* Player 1 */}
                    <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                            <PlayerFlag countryCode={match.player1.country} /> {splitName(match.player1.full_name).surname}
                        </div>
                        {isStillPlaying && isAuthenticated && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: courtColor }}>{currentSet ? currentSet.a : 0}</span>
                                <button onClick={(e) => { e.stopPropagation(); console.log('P1 +'); handleUpdate(match, 'point', 'a', 1); }} style={btnStyle(courtColor)}><Plus size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); console.log('P1 -'); handleUpdate(match, 'point', 'a', -1); }} style={btnStyle(courtColor)}><Minus size={16} /></button>
                            </div>
                        )}
                    </div>

                    {/* Sets Score Center */}
                    <div style={{ padding: '0 2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 800, color: courtColor, lineHeight: 1 }}>
                            {match.score1}:{match.score2}
                        </div>
                        {isAuthenticated && isStillPlaying && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '5px' }}>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); handleUpdate(match, 'set', 'score1', 1); }} style={{ ...btnStyle(courtColor), width: '20px', height: '20px' }}><Plus size={10} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleUpdate(match, 'set', 'score1', -1); }} style={{ ...btnStyle(courtColor), width: '20px', height: '20px' }}><Minus size={10} /></button>
                                </div>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); handleUpdate(match, 'set', 'score2', 1); }} style={{ ...btnStyle(courtColor), width: '20px', height: '20px' }}><Plus size={10} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleUpdate(match, 'set', 'score2', -1); }} style={{ ...btnStyle(courtColor), width: '20px', height: '20px' }}><Minus size={10} /></button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Player 2 */}
                    <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                            {splitName(match.player2.full_name).surname} <PlayerFlag countryCode={match.player2.country} />
                        </div>
                        {isStillPlaying && isAuthenticated && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                                <button onClick={(e) => { e.stopPropagation(); console.log('P2 -'); handleUpdate(match, 'point', 'b', -1); }} style={btnStyle(courtColor)}><Minus size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); console.log('P2 +'); handleUpdate(match, 'point', 'b', 1); }} style={btnStyle(courtColor)}><Plus size={16} /></button>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: courtColor }}>{currentSet ? currentSet.b : 0}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sets History & Add Set */}
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    {(match.microPoints || []).map((s, idx) => (
                        <div key={idx} style={{ padding: '4px 8px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', opacity: idx === (match.microPoints.length - 1) ? 1 : 0.6 }}>
                            <div style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>SET {s.set}</div>
                            <div style={{ fontWeight: 700 }}>{s.a} : {s.b}</div>
                        </div>
                    ))}
                    {isAuthenticated && isStillPlaying && (match.microPoints?.length < bestOf) && (
                        <button onClick={(e) => {
                            e.stopPropagation();
                            const newMicro = [...(match.microPoints || [])];
                            newMicro.push({ set: newMicro.length + 1, a: 0, b: 0 });
                            saveMatches(updateBracketMatch(safeMatches, match.id, match.score1, match.score2, newMicro, players, match.winnerId, match.status), match.id);
                        }} style={{ ...btnStyle('rgba(255,255,255,0.5)'), width: 'auto', padding: '0 8px', fontSize: '0.8rem' }}>
                            <Plus size={10} style={{ marginRight: '4px' }} /> NEW SET
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`live-container ${isTvMode ? 'tv-mode' : ''}`}>
            <div className="tv-controls" style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 10000 }}>
                <button onClick={toggleTvMode} className="btn-primary" style={{ pointerEvents: 'auto' }}>
                    {isTvMode ? <X size={20} /> : <Maximize size={18} />} {isTvMode ? "Exit" : "TV Mode"}
                </button>
            </div>

            <header className="live-header">
                <div>
                    <h1 className="live-title">{t('live.title')}</h1>
                    <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>ID: {activeTournamentId} ({safeMatches.length} Matches)</div>
                </div>
                <div className="digital-clock">{formatTime(currentTime)}</div>
            </header>

            <div className="dashboard-grid">
                <div className="dashboard-column main-column">
                    <div className="courts-container">
                        <div className="court-card compact glass-panel" style={{ borderLeft: '4px solid var(--accent-pink)' }}>
                            <div className="court-header-slim"><span style={{ color: 'var(--accent-pink)' }}>PINK COURT</span></div>
                            {renderLiveMatch(pinkState.current, 'var(--accent-pink)')}
                        </div>
                        <div className="court-card compact glass-panel" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
                            <div className="court-header-slim"><span style={{ color: 'var(--accent-cyan)' }}>CYAN COURT</span></div>
                            {renderLiveMatch(cyanState.current, 'var(--accent-cyan)')}
                        </div>
                    </div>
                </div>
                <div className="dashboard-column side-column">
                    <div className="upcoming-panel glass-panel">
                        <div className="panel-header"><Clock size={16} /> UPCOMING</div>
                        <div style={{ padding: '1rem' }}>
                            {/* Simple list of upcoming */}
                            {[...pinkState.upcoming, ...cyanState.upcoming].slice(0, 5).map(m => (
                                <div key={m.id} style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span>{splitName(m.player1.full_name).surname} vs {splitName(m.player2.full_name).surname}</span>
                                    <span style={{ opacity: 0.5 }}>{(m.bracket || '').toUpperCase()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Live;
