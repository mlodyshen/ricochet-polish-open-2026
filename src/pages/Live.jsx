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

        // Active matches: Live or Pending
        // We want to sort them semantically by ID: WB R1 M1, WB R1 M2...
        // This ensures M1 is visually "before" M10.
        // Importing compareMatchIds is needed (added to top imports in next step if not present)
        const activeMatches = enriched.filter(m => !m.winnerId)
            .sort((a, b) => compareMatchIds(a.id, b.id));

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
                <div className="upcoming-item" style={{ justifyContent: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {t('live.noUpcoming')}
                </div>
            );
        }
        return matchesList.map((match, idx) => {
            const isFirst = idx === 0;
            const alertActive = isFirst && showReadinessAlert;

            return (
                <div key={match.id} className={`upcoming-item ${alertActive ? 'readiness-alert' : ''}`}>
                    {alertActive && (
                        <div className="alert-badge">
                            {t('live.readinessAlert')}
                        </div>
                    )}
                    <div style={{ fontWeight: 600, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <span>
                            <PlayerFlag countryCode={match.player1?.country} /> {match.player1?.full_name || 'TBD'}
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 400, margin: '0 0.5rem' }}>vs</span>
                            <PlayerFlag countryCode={match.player2?.country} /> {match.player2?.full_name || 'TBD'}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        <div>{(match.bracket || '').toUpperCase()} R{match.round}</div>
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
            <div className="live-content-wrapper">
                {/* 1. Panel View (Always Visible) */}
                <div className={`view-layer panel-content active`}>
                    <div className="courts-grid">
                        {/* 1. KORT RÓŻOWY */}
                        <div className="court-card" style={{ borderTop: '4px solid var(--accent-pink)' }}>
                            <div className="court-header" style={{ color: 'var(--accent-pink)' }}>
                                {t('live.courtPink')}
                            </div>
                            <div className="court-content">
                                {renderLiveMatch(pinkState.current, 'var(--accent-pink)')}
                            </div>
                            <div className="upcoming-section">
                                <div className="upcoming-title"><Clock size={12} style={{ marginRight: '6px' }} /> {t('live.upcomingMatches')}</div>
                                {renderUpcomingList(pinkState.upcoming, pinkState.current)}
                            </div>
                        </div>

                        {/* 2. KORT TURKUSOWY */}
                        <div className="court-card" style={{ borderTop: '4px solid var(--accent-cyan)' }}>
                            <div className="court-header" style={{ color: 'var(--accent-cyan)' }}>
                                {t('live.courtCyan')}
                            </div>
                            <div className="court-content">
                                {renderLiveMatch(cyanState.current, 'var(--accent-cyan)')}
                            </div>
                            <div className="upcoming-section">
                                <div className="upcoming-title"><Clock size={12} style={{ marginRight: '6px' }} /> {t('live.upcomingMatches')}</div>
                                {renderUpcomingList(cyanState.upcoming, cyanState.current)}
                            </div>
                        </div>
                    </div>

                    {/* 3. OSTATNIE WYNIKI */}
                    <section className="recent-results-section">
                        <h2 className="section-title text-gradient">
                            <Trophy size={24} /> {t('live.recentResults')}
                        </h2>
                        <div className="recent-grid">
                            {finishedMatches.length > 0 ? finishedMatches.map(match => (
                                <div key={match.id} className="result-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span className="result-court-badge"
                                            style={{
                                                background: match.assignedCourt === 'courtPink' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                                                color: match.assignedCourt === 'courtPink' ? 'var(--accent-pink)' : 'var(--accent-cyan)'
                                            }}>
                                            {t(`live.${match.assignedCourt}`)}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {(match.bracket || '').toUpperCase()} R{match.round}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', color: match.winnerId === match.player1?.id ? 'var(--accent-green)' : 'inherit' }}>
                                            <PlayerFlag countryCode={match.player1?.country} /> {match.player1?.full_name || 'TBD'}
                                        </span>
                                        <span>{match.score1}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', color: match.winnerId === match.player2?.id ? 'var(--accent-green)' : 'inherit' }}>
                                            <PlayerFlag countryCode={match.player2?.country} /> {match.player2?.full_name || 'TBD'}
                                        </span>
                                        <span>{match.score2}</span>
                                    </div>
                                    {match.microPoints && match.microPoints.length > 0 && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af', display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                            {match.microPoints.sort((a, b) => a.set - b.set).map((mp, i) => (
                                                <span key={i}>{mp.a}:{mp.b}{i < match.microPoints.length - 1 ? ',' : ''}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t('live.noResults')}</p>
                            )}
                        </div>
                    </section>
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
