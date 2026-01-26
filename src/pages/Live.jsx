import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatches } from '../hooks/useMatches';
import { usePlayers } from '../hooks/usePlayers';
import { getBestOf } from '../utils/matchUtils';
import { RefreshCw, Trophy, Clock, Activity } from 'lucide-react';
import './Live.css';

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
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    useEffect(() => {
        setLastUpdate(Date.now());
    }, [matches]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        window.location.reload();
    };

    const secondsAgo = Math.floor((currentTime - lastUpdate) / 1000);

    // --- LOGIC CENTRAL ---
    const { pinkQueue, cyanQueue, finishedMatches } = useMemo(() => {
        if (!matches || matches.length === 0) {
            return { pinkQueue: [], cyanQueue: [], finishedMatches: [] };
        }

        // 1. Enrich Matches
        const enriched = matches.map(m => {
            const p1 = players.find(p => p.id === m.player1Id);
            const p2 = players.find(p => p.id === m.player2Id);
            return {
                ...m,
                player1: p1 || { full_name: 'TBD', id: null, isBye: false },
                player2: p2 || { full_name: 'TBD', id: null, isBye: false }
            };
        }).filter(m => m.player1Id && m.player2Id && !m.player1.isBye && !m.player2.isBye);

        // 2. Assign Courts & Split by Status
        const pinkQ = [];
        const cyanQ = [];
        const finished = [];

        enriched.forEach((m, index) => {
            // Match Order: 1, 2, 3... (index+1)
            // 1=Pink, 2=Cyan, 3=Pink...
            const matchOrder = index + 1;
            const court = matchOrder % 2 !== 0 ? 'courtPink' : 'courtCyan';

            // Attach assigned court to a lightweight wrapper (or clone)
            const matchWithCourt = { ...m, assignedCourt: court, matchOrder };

            if (m.winnerId) {
                finished.push(matchWithCourt);
            } else {
                if (court === 'courtPink') pinkQ.push(matchWithCourt);
                else cyanQ.push(matchWithCourt);
            }
        });

        // 3. Process Finished for Recent Results
        // Since we don't have timestamps, use reverse array order (later rounds = later index)
        const recentFinished = finished.reverse().slice(0, 4);

        return {
            pinkQueue: pinkQ,
            cyanQueue: cyanQ,
            finishedMatches: recentFinished
        };
    }, [matches, players]);

    const getCourtState = (queue) => {
        // Find "current": Priority to LIVE (score > 0), else first Pending
        const liveMatch = queue.find(m => (m.score1 > 0 || m.score2 > 0));
        const current = liveMatch || queue[0] || null;

        // Upcoming: All matches after the current one
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
            <div className="match-bracket-info">
                {t('live.noMatch')}
            </div>
            <div className="players-versus">
                <div className="player-container left">
                    <div className="player-surname text-secondary">--</div>
                    <div className="player-firstname text-secondary">--</div>
                </div>

                <div className="score-display">
                    <span className="big-score" style={{ color: courtColor }}>--</span>
                    <span className="vs-divider"> : </span>
                    <span className="big-score" style={{ color: courtColor }}>--</span>
                </div>

                <div className="player-container right">
                    <div className="player-surname text-secondary">--</div>
                    <div className="player-firstname text-secondary">--</div>
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
                    {/* Player 1 (Left) */}
                    <div className="player-container left" title={match.player1.full_name}
                        style={{ color: match.score1 > match.score2 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        <div className="player-surname">{splitName(match.player1.full_name).surname}</div>
                        <div className="player-firstname">{splitName(match.player1.full_name).firstName}</div>
                    </div>

                    {/* Score (Center) */}
                    <div className="score-display">
                        <span className="big-score" style={{ color: courtColor }}>
                            {(match.winnerId || match.score1 > 0 || match.score2 > 0) ? (match.score1 ?? 0) : '-'}
                        </span>
                        <span className="vs-divider"> : </span>
                        <span className="big-score" style={{ color: courtColor }}>
                            {(match.winnerId || match.score1 > 0 || match.score2 > 0) ? (match.score2 ?? 0) : '-'}
                        </span>
                    </div>

                    {/* Player 2 (Right) */}
                    <div className="player-container right" title={match.player2.full_name}
                        style={{ color: match.score2 > match.score1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        <div className="player-surname">{splitName(match.player2.full_name).surname}</div>
                        <div className="player-firstname">{splitName(match.player2.full_name).firstName}</div>
                    </div>
                </div>

                {match.microPoints && match.microPoints.length > 0 && (
                    <div className="micro-points-container">
                        {match.microPoints.map((mp, idx) => (
                            <div key={idx} className="micro-point-badge">
                                S{mp.set}: {mp.a}-{mp.b}
                            </div>
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

    return (
        <div className="live-container fade-in">
            <header className="live-header">
                <div>
                    <h1 className="live-title">{t('live.title')}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {t('live.waitingMessage')}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className="last-updated" style={{ justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                        <Activity size={14} />
                        {t('live.lastUpdate')} {secondsAgo < 5 ? t('live.justNow') : `${secondsAgo}${t('live.secondsAgo')}`}
                    </div>
                    <button className="refresh-btn" onClick={handleRefresh}>
                        <RefreshCw size={16} /> {t('live.refresh')}
                    </button>
                </div>
            </header>

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
                        </div>
                    )) : (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t('live.noResults')}</p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Live;
