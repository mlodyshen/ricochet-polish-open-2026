import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Maximize, Minimize, Trophy, Clock, Activity, PauseCircle, X } from 'lucide-react';
import { useMatches } from '../hooks/useMatches';
import { usePlayers } from '../hooks/usePlayers';
import { getBestOf } from '../utils/matchUtils';
import BracketCanvas from '../components/BracketCanvas';
import './Live.css';

// Helper for Auto Scaling Bracket
const AutoScaledBracket = ({ matches, players }) => {
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const calculateScale = () => {
            if (containerRef.current && contentRef.current) {
                const container = containerRef.current;
                const content = contentRef.current;

                // Allow the content to define its natural size first
                // We assume BracketCanvas has a fixed or large inherent size

                const availW = container.clientWidth;
                const availH = container.clientHeight;
                const contentW = content.scrollWidth;
                const contentH = content.scrollHeight;

                const scaleX = availW / contentW;
                const scaleY = availH / contentH;

                // Fit completely within the container
                // Use 0.95 factor for a small margin
                const newScale = Math.min(scaleX, scaleY, 1) * 0.90;
                setScale(newScale);
            }
        };

        // Delay slightly to allow layout to settle
        const timer = setTimeout(calculateScale, 200);
        window.addEventListener('resize', calculateScale);
        return () => {
            window.removeEventListener('resize', calculateScale);
            clearTimeout(timer);
        };
    }, [matches, players]);

    return (
        <div ref={containerRef} className="auto-bracket-wrapper">
            <div ref={contentRef} className="scaled-content" style={{ transform: `scale(${scale})` }}>
                <BracketCanvas matches={matches} players={players} readonly={true} />
            </div>
        </div>
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

    // Carousel State
    const [viewMode, setViewMode] = useState('panel'); // 'panel' or 'bracket'
    const [timeLeft, setTimeLeft] = useState(45);
    const [isPaused, setIsPaused] = useState(false);

    // Initial load timestamp
    useEffect(() => {
        setLastUpdate(Date.now());
    }, [matches]);

    // Clock & Carousel Timer
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            if (!isPaused) {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        // Switch view
                        setViewMode(v => v === 'panel' ? 'bracket' : 'panel');
                        return 45;
                    }
                    return prev - 1;
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isPaused]);

    const handleRefresh = () => {
        window.location.reload();
    };

    const toggleTvMode = () => {
        if (isTvMode) {
            navigate('/live');
        } else {
            navigate('/live?mode=tv');
        }
    };

    const handleInteraction = () => {
        // Only trigger pause if not already paused
        if (!isPaused) {
            setIsPaused(true);

            // Auto resume after 60s
            // We use a timeout but need to be careful about cleanup if component unmounts
            // For simplicity in this functional component, just setting a timeout is okay, 
            // but if the user clicks again, we might want to extend it. 
            // Ideally we'd use a ref for the timeout ID to clear previous ones.
        }
        // If already paused, we could extend the pause or just let it run.
        // Let's just extend/reset the pause.
    };

    // Effect to handle pause timeout reset
    useEffect(() => {
        let timeout;
        if (isPaused) {
            timeout = setTimeout(() => {
                setIsPaused(false);
            }, 60000);
        }
        return () => clearTimeout(timeout);
    }, [isPaused]);


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

        const pinkQ = [];
        const cyanQ = [];
        const finished = [];

        enriched.forEach((m, index) => {
            const matchOrder = index + 1;
            const court = matchOrder % 2 !== 0 ? 'courtPink' : 'courtCyan';
            const matchWithCourt = { ...m, assignedCourt: court, matchOrder };

            if (m.winnerId) {
                finished.push(matchWithCourt);
            } else {
                if (court === 'courtPink') pinkQ.push(matchWithCourt);
                else cyanQ.push(matchWithCourt);
            }
        });

        const recentFinished = finished.reverse().slice(0, 4);
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
                        <div className="player-surname">{splitName(match.player1.full_name).surname}</div>
                        <div className="player-firstname">{splitName(match.player1.full_name).firstName}</div>
                    </div>
                    <div className="score-display">
                        <span className="big-score" style={{ color: courtColor }}>
                            {(match.winnerId || match.score1 > 0 || match.score2 > 0) ? (match.score1 ?? 0) : '-'}
                        </span>
                        <span className="vs-divider"> : </span>
                        <span className="big-score" style={{ color: courtColor }}>
                            {(match.winnerId || match.score1 > 0 || match.score2 > 0) ? (match.score2 ?? 0) : '-'}
                        </span>
                    </div>
                    <div className="player-container right" style={{ color: match.score2 > match.score1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        <div className="player-surname">{splitName(match.player2.full_name).surname}</div>
                        <div className="player-firstname">{splitName(match.player2.full_name).firstName}</div>
                    </div>
                </div>
                {match.microPoints && match.microPoints.length > 0 && (
                    <div className="micro-points-container" style={{ justifyContent: 'center', gap: '4px', fontSize: '0.75rem', color: '#9ca3af' }}>
                        {match.microPoints.sort((a, b) => a.set - b.set).map((mp, idx) => (
                            <span key={idx}>{mp.a}:{mp.b}{idx < match.microPoints.length - 1 ? ',' : ''}</span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderUpcomingList = (matchesList) => {
        if (!matchesList || matchesList.length === 0) {
            return (
                <div className="upcoming-item" style={{ justifyContent: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {t('live.noUpcoming')}
                </div>
            );
        }
        return matchesList.map(match => (
            <div key={match.id} className="upcoming-item">
                <div style={{ fontWeight: 600, flex: 1 }}>
                    {match.player1?.full_name || 'TBD'} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs</span> {match.player2?.full_name || 'TBD'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    <div>{(match.bracket || '').toUpperCase()} R{match.round}</div>
                </div>
            </div>
        ));
    };

    // Calculate Progress Bar Width
    const progressWidth = isPaused ? 100 : ((timeLeft / 45) * 100);

    return (
        <div className={`live-container ${isTvMode ? 'tv-mode' : ''}`} onClick={handleInteraction}>
            {/* Carousel Progress Bar */}
            <div className="carousel-progress-bar" style={{ width: `${progressWidth}%`, opacity: isPaused ? 0.5 : 1 }}></div>

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
                    {isPaused && (
                        <div style={{ color: 'var(--accent-pink)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <PauseCircle size={16} /> PAUSED (60s)
                        </div>
                    )}
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
                {/* 1. Panel View */}
                <div className={`view-layer panel-content ${viewMode === 'panel' ? 'active' : 'inactive'}`}>
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
                                {renderUpcomingList(pinkState.upcoming)}
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
                                {renderUpcomingList(cyanState.upcoming)}
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
                                        <span style={{ color: match.winnerId === match.player1?.id ? 'var(--accent-green)' : 'inherit' }}>{match.player1?.full_name || 'TBD'}</span>
                                        <span>{match.score1}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                        <span style={{ color: match.winnerId === match.player2?.id ? 'var(--accent-green)' : 'inherit' }}>{match.player2?.full_name || 'TBD'}</span>
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

                {/* 2. Bracket View */}
                <div className={`view-layer ${viewMode === 'bracket' ? 'active' : 'inactive'}`}>
                    {/* We render it always but opacity controls visibility. 
                        However, BracketCanvas layout might need to re-calc if it was hidden. 
                        But opaque '0' elements are still laid out. 
                    */}
                    <AutoScaledBracket matches={matches} players={players} />

                    <div style={{ position: 'absolute', bottom: '2rem', width: '100%', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                        LIVE BRACKET OVERVIEW
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Live;
