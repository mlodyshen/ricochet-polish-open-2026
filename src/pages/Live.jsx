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
        })).reverse().slice(0, 4);

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
            {t('live.waitingForMatch')}
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
            e.stopPropagation();
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

        const gradientBg = `linear-gradient(135deg, color-mix(in srgb, ${courtColor}, transparent 85%) 0%, transparent 100%)`;

        return (
            <div className="broadcast-card" style={{ background: gradientBg }}>
                {isStillPlaying && <div className="broadcast-badge-live">{t('live.liveBadge')}</div>}

                {/* CLICK OVERLAY */}
                {isStillPlaying && isAuthenticated && (
                    <div className="click-overlay">
                        {/* P1 Zone */}
                        <div
                            className="click-zone"
                            onClick={(e) => handleZoneClick(e, 'a')}
                            onContextMenu={(e) => handleZoneContext(e, 'a')}
                        />
                        {/* P2 Zone */}
                        <div
                            className="click-zone"
                            onClick={(e) => handleZoneClick(e, 'b')}
                            onContextMenu={(e) => handleZoneContext(e, 'b')}
                        />
                    </div>
                )}

                {/* HEADER */}
                <div className="broadcast-header">
                    <span style={{ marginRight: '1rem' }}>{(match.bracket || '').toUpperCase()} R{match.round}</span>
                    <span style={{ opacity: 0.5 }}>BO{bestOf}</span>
                </div>

                {/* MAIN CONTENT */}
                <div className="broadcast-content">
                    {/* PLAYER 1 (Left) */}
                    <div className="broadcast-player left">
                        <div className="player-name-group">
                            <span className="player-first">{p1Name.first}</span>
                            <span className="player-last">{p1Name.last}</span>
                        </div>
                        <div className="player-flag-row">
                            <PlayerFlag countryCode={match.player1.country} />
                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{match.player1.country}</span>
                        </div>
                        {isStillPlaying && (
                            <div className="current-points" style={{ color: courtColor }}>
                                {currentSet.a}
                            </div>
                        )}
                        {isAuthenticated && isStillPlaying && <div style={{ fontSize: '0.6rem', opacity: 0.3, marginTop: '4px' }}>{t('live.clickHint')}</div>}
                    </div>

                    {/* SCORE BOARD (Center) */}
                    <div className="broadcast-center">
                        <div className="sets-score-main">
                            {match.score1}:{match.score2}
                        </div>
                        <div className="sets-label">{t('live.sets')}</div>

                        <div className="set-dots">
                            {/* Render visual dots for played sets? Or just mini scores */}
                            {(match.microPoints || []).map((s, idx) => (
                                <div key={idx} style={{
                                    fontSize: '0.7rem',
                                    opacity: 0.7,
                                    color: idx === (match.microPoints.length - 1) ? 'white' : '#aaa'
                                }}>
                                    {s.a}-{s.b}
                                </div>
                            ))}
                        </div>

                        {/* Admin Controls removed as per request */}
                    </div>

                    {/* PLAYER 2 (Right) */}
                    <div className="broadcast-player right">
                        <div className="player-name-group">
                            <span className="player-first">{p2Name.first}</span>
                            <span className="player-last">{p2Name.last}</span>
                        </div>
                        <div className="player-flag-row" style={{ justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{match.player2.country}</span>
                            <PlayerFlag countryCode={match.player2.country} />
                        </div>
                        {isStillPlaying && (
                            <div className="current-points" style={{ color: courtColor }}>
                                {currentSet.b}
                            </div>
                        )}
                        {isAuthenticated && isStillPlaying && <div style={{ fontSize: '0.6rem', opacity: 0.3, marginTop: '4px' }}>{t('live.clickHint')}</div>}
                    </div>
                </div>
            </div>
        );
    };

    const renderUpcomingList = (queue) => {
        if (!queue || queue.length === 0) return <div className="upcoming-item empty">{t('live.noUpcoming')}</div>;
        return queue.map(m => (
            <div key={m.id} className="upcoming-row">
                {/* P1 Section: Flag then Name (Left Aligned) */}
                <div className="upcoming-p1">
                    <PlayerFlag countryCode={m.player1.country} />
                    <span className="upcoming-name">{formatName(m.player1)}</span>
                </div>

                <div className="upcoming-vs">vs</div>

                {/* P2 Section: Name then Flag (Right Aligned) */}
                <div className="upcoming-p2">
                    <span className="upcoming-name">{formatName(m.player2)}</span>
                    <PlayerFlag countryCode={m.player2.country} />
                </div>

                <div className="upcoming-meta">{(m.bracket || '').toUpperCase()} R{m.round}</div>
            </div>
        ));
    };

    return (
        <div className={`live-container ${isTvMode ? 'tv-mode' : ''}`}>



            <header className="live-header">
                <div>
                    <h1 className="live-title text-gradient">{t('live.title')}</h1>
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
                                <span style={{ color: 'var(--accent-pink)', fontWeight: 800 }}>{t('live.courtPinkLabel')}</span>
                            </div>
                            {renderLiveMatch(pinkState.current, 'var(--accent-pink)')}
                        </div>

                        {/* CYAN COURT */}
                        <div className="court-card compact glass-panel" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
                            <div className="court-header-slim">
                                <span style={{ color: 'var(--accent-cyan)', fontWeight: 800 }}>{t('live.courtCyanLabel')}</span>
                            </div>
                            {renderLiveMatch(cyanState.current, 'var(--accent-cyan)')}
                        </div>
                    </div>


                </div>

                {/* RIGHT: SIDEBAR */}
                <div className="dashboard-column side-column">
                    <div className="upcoming-panel glass-panel">
                        <div className="panel-header"><Clock size={16} style={{ marginRight: '8px' }} /> {t('live.upcomingHeader')}</div>

                        <div className="upcoming-group">
                            <div className="group-label" style={{ color: 'var(--accent-pink)' }}>{t('live.pinkQueue')}</div>
                            {renderUpcomingList(pinkState.upcoming)}
                        </div>
                        <div className="divider-line"></div>
                        <div className="upcoming-group">
                            <div className="group-label" style={{ color: 'var(--accent-cyan)' }}>{t('live.cyanQueue')}</div>
                            {renderUpcomingList(cyanState.upcoming)}
                        </div>
                    </div>

                    {/* RECENT RESULTS */}
                    <div className="glass-panel">
                        <div className="panel-header"><Trophy size={16} style={{ marginRight: '8px' }} /> {t('live.recentHeader')}</div>
                        <div style={{ padding: '0 1rem' }}>
                            {finishedMatches.length === 0 && <div className="empty-state">{t('live.recentEmpty')}</div>}
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

            {/* NEWS TICKER - ONLY IN TV MODE */}
            {isTvMode && (
                <div className="news-ticker">
                    <div className="ticker-label">{t('live.tickerLabel')}</div>
                    <div className="ticker-content">
                        <div className="ticker-track">
                            {finishedMatches.length === 0 && (
                                <span className="ticker-item">{t('live.tickerEmpty')}</span>
                            )}
                            {finishedMatches.map((m, i) => (
                                <span key={`ticker-${m.id}-${i}`} className="ticker-item">
                                    <span className="ticker-highlight">{formatName(m.player1)}</span>
                                    <span className="ticker-score">{m.score1}:{m.score2}</span>
                                    <span className="ticker-highlight">{formatName(m.player2)}</span>
                                    <span style={{ opacity: 0.5, marginLeft: '0.5rem', fontSize: '0.7em' }}>{(m.bracket || '').toUpperCase()}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Live;
