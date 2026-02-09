import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Maximize, Clock, Activity, X, Trophy } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import { useTournamentMatches } from '../hooks/useTournamentMatches';
import { usePlayers } from '../hooks/usePlayers';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from '../contexts/TournamentContext';
import { getBestOf, compareMatchIds, getMatchStatus } from '../utils/matchUtils';
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
    const { matches, saveMatches } = useTournamentMatches(); // Replaces useMatches for logic hydration
    const { players, updatePlayer } = usePlayers();
    const { activeTournamentId } = useTournament();

    const location = useLocation();
    const navigate = useNavigate();

    // TV Mode
    const isTvMode = new URLSearchParams(location.search).get('mode') === 'tv';

    // Fullscreen Detection (Supports F11 and JS API)
    const [isFullscreen, setIsFullscreen] = useState(false);
    useEffect(() => {
        const checkFullScreen = () => {
            const isF11 = (window.innerWidth === window.screen.width && window.innerHeight === window.screen.height);
            const isAPI = !!document.fullscreenElement;
            setIsFullscreen(isF11 || isAPI);
        };

        checkFullScreen(); // Init check

        window.addEventListener('resize', checkFullScreen);
        document.addEventListener('fullscreenchange', checkFullScreen);

        return () => {
            window.removeEventListener('resize', checkFullScreen);
            document.removeEventListener('fullscreenchange', checkFullScreen);
        };
    }, []);

    // Time
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // AUTO-FIX NAMES (ONE-OFF)
    useEffect(() => {
        if (!players || players.length === 0) return;

        const RANDOM_NAMES = [
            "Jan Kowalski", "Piotr Nowak", "Adam Wiśniewski", "Krzysztof Wójcik", "Michał Kamiński",
            "Tomasz Lewandowski", "Marcin Zieliński", "Andrzej Szymański", "Jakub Woźniak", "Dariusz Dąbrowski",
            "Marek Kozłowski", "Lukasz Jankowski", "Grzegorz Mazur", "Mateusz Kwiatkowski", "Pawel Krawczyk",
            "James Smith", "Michael Johnson", "Robert Williams", "David Brown", "William Jones",
            "Richard Garcia", "Joseph Miller", "Thomas Davis", "Charles Rodriguez", "Daniel Martinez",
            "Hans Muller", "Klaus Weber", "Jurgen Schmidt", "Karl Wagner", "Stefan Meyer",
            "Pierre Dubois", "Jean Martin", "Carlos Sainz", "Max Verstappen", "Lando Norris", "Lewis Hamilton"
        ];

        players.forEach((p, i) => {
            if ((p.full_name || '').startsWith('Player ')) {
                const newName = RANDOM_NAMES[i % RANDOM_NAMES.length];
                updatePlayer(p.id, { full_name: newName });
            }
        });
    }, [players, updatePlayer]);

    const formatTime = (date) => date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // --- QUEUE LOGIC ---
    const { pinkQueue, cyanQueue, pinkRecent, cyanRecent } = useMemo(() => {
        if (!matches || !matches.length) return { pinkQueue: [], cyanQueue: [], pinkRecent: [], cyanRecent: [] };

        const enriched = matches.map(m => ({
            ...m,
            player1: players.find(p => p.id === m.player1Id) || { full_name: 'TBD', id: null },
            player2: players.find(p => p.id === m.player2Id) || { full_name: 'TBD', id: null }
        }));

        const active = enriched.filter(m => {
            const calculatedStatus = getMatchStatus({ ...m, winner_id: m.winnerId });
            const s = calculatedStatus.toLowerCase();
            const p1Ready = m.player1 && m.player1.id;
            const p2Ready = m.player2 && m.player2.id;
            const isBye = m.player1?.isBye || m.player2?.isBye;
            return !m.winnerId && p1Ready && p2Ready && !isBye && ['live', 'pending'].includes(s);
        }).sort((a, b) => {
            const statusA = getMatchStatus({ ...a, winner_id: a.winnerId }).toLowerCase();
            const statusB = getMatchStatus({ ...b, winner_id: b.winnerId }).toLowerCase();

            if (statusA === 'live' && statusB !== 'live') return -1;
            if (statusA !== 'live' && statusB === 'live') return 1;

            if (a.manualOrder !== undefined || b.manualOrder !== undefined) {
                const oa = a.manualOrder ?? Number.MAX_SAFE_INTEGER;
                const ob = b.manualOrder ?? Number.MAX_SAFE_INTEGER;
                if (oa !== ob) return oa - ob;
            }
            return compareMatchIds(a.id, b.id);
        });

        const pink = [];
        const cyan = [];

        // RECENT MATCHES CALCULATION
        const finished = enriched.filter(m => getMatchStatus({ ...m, winner_id: m.winnerId }) === 'finished')
            .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0)); // Newest first

        const pinkRecent = [];
        const cyanRecent = [];

        // Distribute Active & Pending
        active.forEach((m) => {
            let court = '';
            if (m.court) {
                const cUpper = m.court.toUpperCase();
                if (cUpper.includes('LEWY') || cUpper.includes('LEFT') || cUpper.includes('RÓŻOWY') || cUpper.includes('PINK') || m.court === 'pink') court = 'courtPink';
                else if (cUpper.includes('PRAWY') || cUpper.includes('RIGHT') || cUpper.includes('TURKUSOWY') || cUpper.includes('CYAN') || m.court === 'cyan') court = 'courtCyan';
            }
            if (!court) {
                if (pink.length <= cyan.length) court = 'courtPink';
                else court = 'courtCyan';
            }
            const mWithCourt = { ...m, assignedCourt: court };
            if (court === 'courtPink') pink.push(mWithCourt);
            else cyan.push(mWithCourt);
        });

        // Distribute Finished (Recent) based on court assignment
        finished.forEach(m => {
            let court = '';
            if (m.court) {
                const cUpper = m.court.toUpperCase();
                if (cUpper.includes('LEWY') || cUpper.includes('LEFT') || m.court === 'pink') court = 'courtPink';
                else if (cUpper.includes('PRAWY') || cUpper.includes('RIGHT') || m.court === 'cyan') court = 'courtCyan';
            }
            // If no court assigned for finished match, maybe skip or assign default? 
            // Let's assign based on ID parity if unknown, or just skip to avoid clutter
            if (court === 'courtPink') pinkRecent.push(m);
            else if (court === 'courtCyan') cyanRecent.push(m);
        });

        return { pinkQueue: pink, cyanQueue: cyan, pinkRecent: pinkRecent.slice(0, 2), cyanRecent: cyanRecent.slice(0, 2) };
    }, [matches, players]);

    const getCourtState = (queue, recent) => {
        const current = queue.length > 0 ? queue[0] : null;
        const upcoming = queue.slice(1, 6);
        return { current, upcoming, recent: recent || [] };
    };

    const pinkState = getCourtState(pinkQueue, pinkRecent);
    const cyanState = getCourtState(cyanQueue, cyanRecent);

    // --- SCORE HANDLER ---
    const handleUpdate = (match, type, playerKey, change) => {
        if (!match || !isAuthenticated) return;

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

        const nextState = updateBracketMatch(matches, match.id, score1, score2, microPoints, players, winnerId, status);
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

        return (
            <div className="broadcast-card">
                <div className="broadcast-content">
                    {/* PLAYER 1 (Left) */}
                    <div className="broadcast-player left"
                        onClick={() => handleUpdate(match, 'point', 'player1', 1)}
                        onContextMenu={(e) => { e.preventDefault(); handleUpdate(match, 'point', 'player1', -1); }}>
                        <div className="player-first">{p1Name.first}</div>
                        <div className="player-last">{p1Name.last}</div>
                        <div className="player-flag-row">
                            <PlayerFlag countryCode={match.player1.country} /> <span style={{ marginLeft: '6px' }}>{match.player1.country}</span>
                        </div>
                    </div>

                    {/* CENTER: SETS */}
                    <div className="broadcast-center">
                        <div className="sets-score-main">
                            {match.score1 ?? 0} : {match.score2 ?? 0}
                        </div>
                        <div className="sets-label">{t('live.sets')}</div>
                        <div className="set-dots">
                            {(match.microPoints || []).map((s, idx) => (
                                <div key={idx} style={{ fontSize: '0.7rem', opacity: 0.7, color: idx === (match.microPoints.length - 1) ? 'white' : '#aaa' }}>
                                    {s.a}-{s.b}
                                </div>
                            ))}
                        </div>
                        {match.bracket && (
                            <div style={{ marginTop: '0.5rem', opacity: 0.5, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                {match.bracket} R{match.round} | {t('live.bo', { n: bestOf })}
                            </div>
                        )}
                    </div>

                    {/* PLAYER 2 (Right) */}
                    <div className="broadcast-player right"
                        onClick={() => handleUpdate(match, 'point', 'player2', 1)}
                        onContextMenu={(e) => { e.preventDefault(); handleUpdate(match, 'point', 'player2', -1); }}>
                        <div className="player-first">{p2Name.first}</div>
                        <div className="player-last">{p2Name.last}</div>
                        <div className="player-flag-row" style={{ justifyContent: 'flex-end' }}>
                            <span style={{ marginRight: '6px' }}>{match.player2.country}</span> <PlayerFlag countryCode={match.player2.country} />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderUpcomingList = (queue) => {
        if (!queue || queue.length === 0) return <div className="upcoming-item empty">{t('live.noUpcoming')}</div>;
        return queue.map(m => {
            const bestOf = getBestOf(m.bracket);
            const p1 = splitNameForDisplay(formatName(m.player1));
            const p2 = splitNameForDisplay(formatName(m.player2));

            return (
                <div key={m.id} className="upcoming-row-new">
                    <div className="upcoming-round-badge">
                        {(m.bracket || '').replace('bracket', '').trim()} R{m.round}
                    </div>
                    <div className="u-player left">
                        <div className="u-name-group">
                            <span className="u-first">{p1.first}</span>
                            <span className="u-last">{p1.last}</span>
                        </div>
                        <PlayerFlag countryCode={m.player1.country} />
                    </div>
                    <div className="u-center-stack">
                        <div className="u-vs">{t('common.vs')}</div>
                        <div className="u-bo-badge">{t('live.bo', { n: bestOf })}</div>
                    </div>
                    <div className="u-player right">
                        <PlayerFlag countryCode={m.player2.country} />
                        <div className="u-name-group">
                            <span className="u-first">{p2.first}</span>
                            <span className="u-last">{p2.last}</span>
                        </div>
                    </div>
                </div>
            );
        });
    };

    const renderRecentList = (queue) => {
        if (!queue || queue.length === 0) return <div className="upcoming-item empty">{t('live.noResults')}</div>;
        return queue.map(m => {
            const bestOf = getBestOf(m.bracket);
            const p1 = splitNameForDisplay(formatName(m.player1));
            const p2 = splitNameForDisplay(formatName(m.player2));

            return (
                <div key={m.id} className="upcoming-row-new">
                    <div className="upcoming-round-badge">
                        {(m.bracket || '').replace('bracket', '').trim()} R{m.round}
                    </div>
                    <div className="u-player left">
                        <div className="u-name-group">
                            <span className="u-first">{p1.first}</span>
                            <span className="u-last">{p1.last}</span>
                        </div>
                        <PlayerFlag countryCode={m.player1.country} />
                    </div>
                    <div className="u-center-stack">
                        <div className="u-vs" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', letterSpacing: '2px' }}>
                            {m.score1}:{m.score2}
                        </div>
                        <div className="u-bo-badge" style={{ marginTop: '2px', opacity: 0.7 }}>BO{bestOf}</div>
                    </div>
                    <div className="u-player right">
                        <PlayerFlag countryCode={m.player2.country} />
                        <div className="u-name-group">
                            <span className="u-first">{p2.first}</span>
                            <span className="u-last">{p2.last}</span>
                        </div>
                    </div>
                </div>
            );
        });
    };

    return (
        <div className={`live-container ${isTvMode ? 'tv-mode' : ''}`}>
            {/* HEADER */}
            <header className="live-header">
                <div>
                    <h1 className="live-title text-gradient">{t('live.title')}</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="digital-clock">{formatTime(currentTime)}</div>
                </div>
            </header>

            {/* MAIN GRID - 2 EQUAL COLUMNS */}
            <div className={`courts-container ${isFullscreen && isTvMode ? 'tv-fullscreen' : ''}`}>
                {/* COLUMN 1: LEFT COURT (LEWY) */}
                <div className="court-column">
                    <div className="court-card pink">
                        <div className="court-header-slim">
                            <span style={{ color: 'var(--accent-pink)' }}>
                                {t('live.courtPink')}
                            </span>
                        </div>
                        {pinkState.current ? renderLiveMatch(pinkState.current, 'var(--accent-pink)') : renderEmptyLive('var(--accent-pink)')}
                    </div>
                    <div className="upcoming-panel glass-panel" style={{ marginTop: '1rem' }}>
                        <div className="panel-header" style={{ color: 'var(--accent-pink)' }}>{t('live.queueLeft')}</div>
                        {renderUpcomingList(pinkState.upcoming)}
                    </div>

                    {/* RECENT MATCHES - TV MODE ONLY */}
                    {isTvMode && isFullscreen && (
                        <div className="upcoming-panel glass-panel" style={{ marginTop: '1rem', borderTop: '2px solid var(--accent-pink)' }}>
                            <div className="panel-header" style={{ color: 'var(--accent-pink)', opacity: 0.8 }}>{t('live.recentHeader')}</div>
                            {renderRecentList(pinkState.recent)}
                        </div>
                    )}
                </div>

                {/* COLUMN 2: RIGHT COURT (PRAWY) */}
                <div className="court-column">
                    <div className="court-card cyan">
                        <div className="court-header-slim">
                            <span style={{ color: '#21468B' }}>
                                {t('live.courtCyan')}
                            </span>
                        </div>
                        {cyanState.current ? renderLiveMatch(cyanState.current, '#21468B') : renderEmptyLive('#21468B')}
                    </div>
                    <div className="upcoming-panel glass-panel" style={{ marginTop: '1rem' }}>
                        <div className="panel-header" style={{ color: '#21468B' }}>{t('live.queueRight')}</div>
                        {renderUpcomingList(cyanState.upcoming)}
                    </div>

                    {/* RECENT MATCHES - TV MODE ONLY */}
                    {isTvMode && isFullscreen && (
                        <div className="upcoming-panel glass-panel" style={{ marginTop: '1rem', borderTop: '2px solid #21468B' }}>
                            <div className="panel-header" style={{ color: '#21468B', opacity: 0.8 }}>{t('live.recentHeader')}</div>
                            {renderRecentList(cyanState.recent)}
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
};

export default Live;
