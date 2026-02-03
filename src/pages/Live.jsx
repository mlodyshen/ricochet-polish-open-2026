import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Maximize, Trophy, Clock, Activity, X } from 'lucide-react';
import { useMatches } from '../hooks/useMatches';
import { usePlayers } from '../hooks/usePlayers';
import { getBestOf, compareMatchIds } from '../utils/matchUtils';
import { getCountryCode } from '../constants/countries';
import './Live.css';

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
    const { matches } = useMatches();
    const { players } = usePlayers();
    const location = useLocation();
    const navigate = useNavigate();

    // TV Mode Detection
    const isTvMode = new URLSearchParams(location.search).get('mode') === 'tv';

    // State
    const [currentTime, setCurrentTime] = useState(new Date());
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    // Initial load timestamp
    useEffect(() => {
        setLastUpdate(Date.now());
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
        }).filter(m => m.player1Id && m.player2Id && !m.player1.isBye && !m.player2.isBye);

        // Separate finished and active matches
        const finished = enriched.filter(m => m.winnerId);

        // Active matches: Live or Pending (or recently completed)
        // User Request: filter(m => m.status === 'live' || m.status === 'completed')
        // We prioritise LIVE matches first, then by ID.
        const activeMatches = enriched.filter(m =>
            (m.status === 'live' || m.status === 'pending') && !m.winnerId
        )
            .sort((a, b) => {
                // Priority 1: Status 'live' comes first
                if (a.status === 'live' && b.status !== 'live') return -1;
                if (a.status !== 'live' && b.status === 'live') return 1;

                // Priority 2: Original ID order
                return compareMatchIds(a.id, b.id);
            });

        const pinkQ = [];
        const cyanQ = [];

        // Distribute Active Matches to Courts based on sorted order.
        // 1st match (M1) -> Pink
        // 2nd match (M2) -> Cyan
        // 3rd (M3) -> Pink queue
        // 4th (M4) -> Cyan queue
        activeMatches.forEach((m, index) => {
            const matchOrder = index + 1;
            const court = matchOrder % 2 !== 0 ? 'courtPink' : 'courtCyan';
            const matchWithCourt = { ...m, assignedCourt: court, matchOrder };

            if (court === 'courtPink') pinkQ.push(matchWithCourt);
            else cyanQ.push(matchWithCourt);
        });

        // For finished matches, we might want to keep court info if we tracked it, 
        // but here we just assign strictly for display if needed or leave empty.
        // The original logic assigned courts to all. Let's replicate strict assignment logic for consistency or just return list.
        // The display logic for recent results uses 'assignedCourt', so we should map that if possible.
        // Since we don't store court permanently, we can't perfectly recall where M1 happened if M1 is finished.
        // We will mock it or just use 'courtPink' default for finished to avoid errors, or try to infer.
        // Actually best is to just properly attribute them if they were part of the sequence.
        // Simplification: Render them without specific court color dependency if possible, or alternating.
        const enrichedFinished = finished.map((m, i) => ({
            ...m, assignedCourt: i % 2 === 0 ? 'courtPink' : 'courtCyan'
        }));

        const recentFinished = enrichedFinished.reverse().slice(0, 4);
        return { pinkQueue: pinkQ, cyanQueue: cyanQ, finishedMatches: recentFinished };
    }, [matches, players]);

    const getCourtState = (queue) => {
        const liveMatch = queue.find(m => (m.score1 > 0 || m.score2 > 0));
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

    // --- RENDERERS ---
    const renderEmptyLive = (courtColor) => (
        <div className="live-match-display" style={{ opacity: 0.7 }}>
            <div className="match-bracket-info">{t('live.noMatch')}</div>
            <div className="players-versus">
                <div className="player-container left">
                    <div className="player-surname text-secondary">--</div>
                </div>
                <div className="score-display">
                    <span className="big-score" style={{ color: courtColor }}>--</span>
                    <span className="vs-divider"> : </span>
                    <span className="big-score" style={{ color: courtColor }}>--</span>
                </div>
                <div className="player-container right">
                    <div className="player-surname text-secondary">--</div>
                </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
                {t('live.autoMatchInfo')}
            </p>
        </div>
    );

    const renderLiveMatch = (match, courtColor) => {
        if (!match) return renderEmptyLive(courtColor);
        const bestOf = getBestOf(match.bracket);
        const isLive = (match.score1 > 0 || match.score2 > 0);

        // Prepare micro points (sets)
        const sets = match.microPoints || [];
        const sortedSets = [...sets].sort((a, b) => a.set - b.set);

        return (
            <div className="live-match-display">
                {isLive && (
                    <div style={{
                        background: '#ef4444', color: 'white', display: 'inline-block',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.5rem',
                        animation: 'pulse 2s infinite'
                    }}>
                        {t('live.liveBadge')}
                    </div>
                )}
                <div className="match-bracket-info">
                    {match.bracket === 'wb' ? t('live.wb') : match.bracket === 'lb' ? t('live.lb') : t('live.gf')} • {t('live.round')} {match.round} • BO{bestOf}
                </div>
                <div className="players-versus">
                    <div className="player-container left" style={{ color: match.score1 > match.score2 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        <div className="player-surname">
                            <PlayerFlag countryCode={match.player1.country} />
                            {splitName(match.player1.full_name).surname}
                        </div>
                        <div className="player-firstname">{splitName(match.player1.full_name).firstName}</div>
                    </div>

                    <div className="score-center-col">
                        <div className="score-display">
                            <span className="big-score" style={{ color: courtColor }}>
                                {(match.winnerId || match.score1 > 0 || match.score2 > 0) ? (match.score1 ?? 0) : '-'}
                            </span>
                            <span className="vs-divider"> : </span>
                            <span className="big-score" style={{ color: courtColor }}>
                                {(match.winnerId || match.score1 > 0 || match.score2 > 0) ? (match.score2 ?? 0) : '-'}
                            </span>
                        </div>
                    </div>

                    <div className="player-container right" style={{ color: match.score2 > match.score1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        <div className="player-surname">
                            {/* Flag before name per request, even on right side? */}
                            {/* If right aligned, "Flag Name" might put flag far right if using flex? 
                                 Right container has align-items: flex-end.
                                 So elements stack vertically.
                                 Wait, surname is a block/div?
                                 `div.player-surname` contains text.
                                 I'll put <PlayerFlag /> inside.
                             */}
                            <PlayerFlag countryCode={match.player2.country} />
                            {splitName(match.player2.full_name).surname}
                        </div>
                        <div className="player-firstname">{splitName(match.player2.full_name).firstName}</div>
                    </div>
                </div>

                {/* Sets Display */}
                {sortedSets.length > 0 && (
                    <div className="sets-container">
                        {sortedSets.map((s, idx) => (
                            <div key={idx} className="set-box">
                                <div className="set-label">SET {s.set}</div>
                                <div className="set-score">
                                    <span className={s.a > s.b ? 'set-winner' : ''}>{s.a}</span>
                                    <span>:</span>
                                    <span className={s.b > s.a ? 'set-winner' : ''}>{s.b}</span>
                                </div>
                            </div>
                        ))}
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
