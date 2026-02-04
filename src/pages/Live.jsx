import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Maximize, Clock, Activity, X, Trophy } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import { useMatches } from '../hooks/useMatches';
import { usePlayers } from '../hooks/usePlayers';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from '../contexts/TournamentContext';
import { getBestOf, compareMatchIds, checkMatchStatus } from '../utils/matchUtils';
import { updateBracketMatch } from '../utils/bracketLogic';
import { getCountryCode } from '../constants/countries';
import './Live.css';

// --- HELPERS ---

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

const formatName = (p) => {
    if (!p) return 'TBD';
    if (p.full_name) return p.full_name;
    if (p.firstName && p.lastName) return `${p.firstName} ${p.lastName}`;
    return 'Unknown Player';
};

const splitNameForDisplay = (fullName) => {
    if (!fullName) return { first: '', last: 'TBD' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) return { first: '', last: fullName };
    const last = parts.pop();
    const first = parts.join(' ');
    return { first, last };
};

const Live = () => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const { matches, saveMatches } = useMatches();
    const { players } = usePlayers();
    const { activeTournamentId } = useTournament();

    const location = useLocation();
    const navigate = useNavigate();

    // TV Mode
    const isTvMode = new URLSearchParams(location.search).get('mode') === 'tv';
    const toggleTvMode = () => navigate(isTvMode ? '/live' : '/live?mode=tv');

    // Time
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (date) => date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // --- QUEUE LOGIC ---
    const { pinkQueue, cyanQueue, finishedMatches } = useMemo(() => {
        if (!matches || !matches.length) return { pinkQueue: [], cyanQueue: [], finishedMatches: [] };

        const enriched = matches.map(m => ({
            ...m,
            player1: players.find(p => p.id === m.player1Id) || { full_name: 'TBD', id: null },
            player2: players.find(p => p.id === m.player2Id) || { full_name: 'TBD', id: null }
        }));

        const finished = enriched.filter(m => m.winnerId);

        const active = enriched.filter(m => {
            const s = (m.status || 'pending').toLowerCase();
            return !m.winnerId && ['live', 'pending', 'scheduled'].includes(s);
        }).sort((a, b) => {
            const sA = (a.status || '').toLowerCase();
            const sB = (b.status || '').toLowerCase();
            if (sA === 'live' && sB !== 'live') return -1;
            if (sA !== 'live' && sB === 'live') return 1;
            return compareMatchIds(a.id, b.id);
        });

        const pink = [];
        const cyan = [];

        active.forEach((m, idx) => {
            const court = idx % 2 === 0 ? 'courtPink' : 'courtCyan';
            const mWithCourt = { ...m, assignedCourt: court };
            if (court === 'courtPink') pink.push(mWithCourt);
            else cyan.push(mWithCourt);
        });

        const recentFn = finished.map((m, i) => ({
            ...m,
            assignedCourt: i % 2 === 0 ? 'courtPink' : 'courtCyan'
        })).reverse().slice(0, 5);

        return { pinkQueue: pink, cyanQueue: cyan, finishedMatches: recentFn };
    }, [matches, players]);

    const getCourtState = (queue) => {
        const current = queue.length > 0 ? queue[0] : null;
        const upcoming = queue.slice(1, 4);
        return { current, upcoming };
    };

    const pinkState = getCourtState(pinkQueue);
    const cyanState = getCourtState(cyanQueue);

    // --- SCORE HANDLER ---
    const handleUpdate = (match, type, playerKey, change) => {
        if (!match || !isAuthenticated) return;

        console.log(`[JUDGE] Update: ${match.id} | ${type} | ${playerKey} | ${change}`);

        let score1 = match.score1 ?? 0;
        let score2 = match.score2 ?? 0;
        let microPoints = (match.microPoints || []).map(s => ({ ...s }));

        if (type === 'set') {
            if (playerKey === 'score1') score1 += change;
            if (playerKey === 'score2') score2 += change;
        } else if (type === 'point') {
            let targetSet;
            if (microPoints.length === 0) {
                targetSet = { set: 1, a: 0, b: 0 };
                microPoints.push(targetSet);
            } else {
                targetSet = microPoints[microPoints.length - 1];
            }

            const currentVal = targetSet[playerKey === 'a' ? 'a' : 'b'] || 0;
            const nextVal = Math.max(0, currentVal + change);

            if (playerKey === 'a') targetSet.a = nextVal;
            if (playerKey === 'b') targetSet.b = nextVal;
        }

        score1 = Math.max(0, score1);
        score2 = Math.max(0, score2);

        const bestOf = getBestOf(match.bracket);
        const winThreshold = Math.ceil(bestOf / 2);
        let status = 'live';
        let winnerId = null;

        if (score1 >= winThreshold) { status = 'finished'; winnerId = match.player1.id; }
        else if (score2 >= winThreshold) { status = 'finished'; winnerId = match.player2.id; }

        const nextState = updateBracketMatch(
            matches,
            match.id,
            score1,
            score2,
            microPoints,
            players,
            winnerId,
            status
        );

        saveMatches(nextState, match.id);
    };

    // --- RENDERERS ---

    const renderEmptyLive = (courtColor) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px', opacity: 0.5, fontStyle: 'italic', color: courtColor }}>
            {t('live.waitingForMatch') || "Waiting for match..."}
        </div>
    );

    const renderLiveMatch = (match, courtColor) => {
        if (!match) return renderEmptyLive(courtColor);

        const bestOf = getBestOf(match.bracket);
        const isStillPlaying = !match.winnerId;
        const currentSet = (match.microPoints || []).slice(-1)[0] || { a: 0, b: 0 };
        const p1Name = splitNameForDisplay(formatName(match.player1));
        const p2Name = splitNameForDisplay(formatName(match.player2));

        // INTERACTIVE OVERLAY HANDLERS
        const handleZoneClick = (e, playerKey) => {
            if (!isStillPlaying || !isAuthenticated) return;
            e.preventDefault();
            e.stopPropagation(); // Stop propagation to avoid bubbling
            console.log(`[ZONE] ${playerKey} Point +`);
            handleUpdate(match, 'point', playerKey, 1);
        };

        const handleZoneContext = (e, playerKey) => {
            if (!isStillPlaying || !isAuthenticated) return;
            e.preventDefault();
            e.stopPropagation();
            console.log(`[ZONE] ${playerKey} Point -`);
            handleUpdate(match, 'point', playerKey, -1);
        };

        return (
            <div style={{ position: 'relative', padding: '1rem', userSelect: 'none', overflow: 'hidden' }}>
                {isStillPlaying && <div className="live-badge">LIVE</div>}

                {/* --- CLICK-TO-SCORE OVERLAY (ABSOLUTE) --- */}
                {isStillPlaying && isAuthenticated && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        zIndex: 100, display: 'flex'
                    }}>
                        {/* P1 Zone */}
                        <div
                            style={{ flex: 1, height: '100%', cursor: 'pointer' }}
                            onClick={(e) => handleZoneClick(e, 'a')}
                            onContextMenu={(e) => handleZoneContext(e, 'a')}
                            className="score-zone-activator" // For CSS scaling/hover effects if needed
                        />
                        {/* P2 Zone */}
                        <div
                            style={{ flex: 1, height: '100%', cursor: 'pointer' }}
                            onClick={(e) => handleZoneClick(e, 'b')}
                            onContextMenu={(e) => handleZoneContext(e, 'b')}
                            className="score-zone-activator"
                        />
                    </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontFamily: 'monospace', position: 'relative', zIndex: 10 }}>
                    {(match.bracket || '').toUpperCase()} R{match.round} • BO{bestOf}
                </div>

                <div className="players-versus" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 10, pointerEvents: 'none' }}>

                    {/* LEFT PLAYER VISUALS */}
                    <div style={{ flex: 1, textAlign: 'left', padding: '10px' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <PlayerFlag countryCode={match.player1.country} />
                            <span>{p1Name.first} {p1Name.last}</span>
                        </div>
                        {isStillPlaying && (
                            <div style={{ marginTop: '0.5rem', fontSize: '3.5rem', fontWeight: 800, color: courtColor, lineHeight: 1 }}>
                                {currentSet.a}
                            </div>
                        )}
                        {/* Validation hint for admin */}
                        {isAuthenticated && isStillPlaying && <div style={{ fontSize: '0.7rem', opacity: 0.3, marginTop: '4px' }}>L-Click(+), R-Click(-)</div>}
                    </div>

                    {/* SCORE CENTER */}
                    <div style={{ padding: '0 1rem', textAlign: 'center', minWidth: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', opacity: 0.9 }}>
                            {match.score1}:{match.score2}
                        </div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5 }}>SETS</div>

                        {/* Manual Set Adjust (Only interactive element on top of overlay) */}
                        {isAuthenticated && isStillPlaying && (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px', pointerEvents: 'auto' }}>
                                <button style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa', cursor: 'pointer', padding: '2px 6px', fontSize: '0.6rem', borderRadius: '4px', zIndex: 101 }}
                                    onClick={(e) => { e.stopPropagation(); handleUpdate(match, 'set', 'score1', 1) }}>
                                    +S1
                                </button>
                                <button style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa', cursor: 'pointer', padding: '2px 6px', fontSize: '0.6rem', borderRadius: '4px', zIndex: 101 }}
                                    onClick={(e) => { e.stopPropagation(); handleUpdate(match, 'set', 'score2', 1) }}>
                                    +S2
                                </button>
                            </div>
                        )}
                        {isAuthenticated && isStillPlaying && (match.microPoints?.length < bestOf) && (
                            <button style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa', cursor: 'pointer', padding: '2px 6px', fontSize: '0.6rem', borderRadius: '4px', marginTop: '4px', zIndex: 101, pointerEvents: 'auto' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newMicro = [...(match.microPoints || [])];
                                    newMicro.push({ set: newMicro.length + 1, a: 0, b: 0 });
                                    const nextState = updateBracketMatch(matches, match.id, match.score1, match.score2, newMicro, players, match.winnerId, match.status);
                                    saveMatches(nextState, match.id);
                                }}>
                                +SET
                            </button>
                        )}
                    </div>

                    {/* RIGHT PLAYER VISUALS */}
                    <div style={{ flex: 1, textAlign: 'right', padding: '10px' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                            <span>{p2Name.first} {p2Name.last}</span>
                            <PlayerFlag countryCode={match.player2.country} />
                        </div>
                        {isStillPlaying && (
                            <div style={{ marginTop: '0.5rem', fontSize: '3.5rem', fontWeight: 800, color: courtColor, lineHeight: 1 }}>
                                {currentSet.b}
                            </div>
                        )}
                        {isAuthenticated && isStillPlaying && <div style={{ fontSize: '0.7rem', opacity: 0.3, marginTop: '4px' }}>L-Click(+), R-Click(-)</div>}
                    </div>
                </div>

                {/* SET HISTORY */}
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', position: 'relative', zIndex: 10, pointerEvents: 'none' }}>
                    {(match.microPoints || []).map((s, idx) => (
                        <div key={idx} style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', opacity: idx === (match.microPoints.length - 1) ? 1 : 0.6 }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.7 }}>SET {s.set}</div>
                            <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{s.a} - {s.b}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderUpcomingList = (queue) => {
        if (!queue || queue.length === 0) return <div className="upcoming-item empty">{t('live.noUpcoming')}</div>;
        return queue.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <PlayerFlag countryCode={m.player1.country} /> <span>{formatName(m.player1)}</span>
                    <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>vs</span>
                    <span>{formatName(m.player2)}</span> <PlayerFlag countryCode={m.player2.country} />
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.5, fontFamily: 'monospace' }}>{(m.bracket || '').toUpperCase()} R{m.round}</div>
            </div>
        ));
    };

    return (
        <div className={`live-container ${isTvMode ? 'tv-mode' : ''}`}>

            {/* TV CONTROL */}
            <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 10000 }}>
                <button onClick={toggleTvMode} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
                    {isTvMode ? <X size={18} /> : <Maximize size={18} />} {isTvMode ? "Exit" : "TV Mode"}
                </button>
            </div>

            <header className="live-header">
                <div>
                    <h1 className="live-title">{t('live.title')}</h1>
                    <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                        ID: {activeTournamentId} • Loaded: {matches?.length || 0}
                    </div>
                </div>
                <div className="digital-clock">{formatTime(currentTime)}</div>
            </header>

            <div className="dashboard-grid">
                {/* LEFT: COURTS */}
                <div className="dashboard-column main-column">
                    <div className="courts-container">
                        {/* PINK COURT */}
                        <div className="court-card compact glass-panel" style={{ borderLeft: '4px solid var(--accent-pink)' }}>
                            <div className="court-header-slim">
                                <span style={{ color: 'var(--accent-pink)', fontWeight: 800 }}>PINK COURT</span>
                            </div>
                            {renderLiveMatch(pinkState.current, 'var(--accent-pink)')}
                        </div>

                        {/* CYAN COURT */}
                        <div className="court-card compact glass-panel" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
                            <div className="court-header-slim">
                                <span style={{ color: 'var(--accent-cyan)', fontWeight: 800 }}>CYAN COURT</span>
                            </div>
                            {renderLiveMatch(cyanState.current, 'var(--accent-cyan)')}
                        </div>
                    </div>

                    {/* RECENT RESULTS */}
                    <div className="glass-panel" style={{ marginTop: '2rem' }}>
                        <div className="panel-header"><Trophy size={16} style={{ marginRight: '8px' }} /> RECENT RESULTS</div>
                        <div style={{ padding: '0 1rem' }}>
                            {finishedMatches.length === 0 && <div className="empty-state">No results yet.</div>}
                            {finishedMatches.map(m => (
                                <div key={m.id} className="recent-item-clean">
                                    <div className="recent-meta" style={{ width: '120px' }}>
                                        <span className={`court-dot ${m.assignedCourt === 'courtPink' ? 'pink' : 'cyan'}`}></span>
                                        <span className="match-id">{(m.bracket || '').toUpperCase()} R{m.round}</span>
                                    </div>
                                    <div className="recent-players">
                                        <span className={m.winnerId === m.player1.id ? 'winner' : ''}>{formatName(m.player1)}</span>
                                        <span className="vs">vs</span>
                                        <span className={m.winnerId === m.player2.id ? 'winner' : ''}>{formatName(m.player2)}</span>
                                    </div>
                                    <div className="recent-score">{m.score1}:{m.score2}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: SIDEBAR */}
                <div className="dashboard-column side-column">
                    <div className="upcoming-panel glass-panel">
                        <div className="panel-header"><Clock size={16} style={{ marginRight: '8px' }} /> UPCOMING</div>

                        <div className="upcoming-group">
                            <div className="group-label" style={{ color: 'var(--accent-pink)' }}>PINK QUEUE</div>
                            {renderUpcomingList(pinkState.upcoming)}
                        </div>
                        <div className="divider-line"></div>
                        <div className="upcoming-group">
                            <div className="group-label" style={{ color: 'var(--accent-cyan)' }}>CYAN QUEUE</div>
                            {renderUpcomingList(cyanState.upcoming)}
                        </div>
                    </div>
                </div>
            </div>

            {/* QR WIDGET */}
            <div className="qr-widget" style={{ zIndex: 90 }}>
                <div className="qr-box" style={{ background: 'white', padding: '5px' }}>
                    <QRCodeCanvas
                        value={`${window.location.origin}/live?mode=mobile`}
                        size={80}
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                        level={"M"}
                        includeMargin={false}
                    />
                </div>
                <div className="qr-label">{t('live.scanForResults')}</div>
            </div>

        </div>
    );
};

export default Live;
