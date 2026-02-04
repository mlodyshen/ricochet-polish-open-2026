import React, { useMemo, useRef, useLayoutEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../pages/Brackets.css';
import RacketBadge, { RacketIcon } from './RacketBadge';
import { getRacketPathConfig, getMatchColor } from '../utils/racketPathUtils';
import { getBracketBlueprint } from '../utils/bracketLogic';

const BracketCanvas = ({ matches, players, onMatchClick, readonly = false, visibleSections = ['wb', 'mid', 'lb'] }) => {
    const { t } = useTranslation();
    const containerRef = useRef(null);
    const matchRefs = useRef({});
    // --- 4. Interactive Highlight (Path to Final) ---
    const [hoveredMatchId, setHoveredMatchId] = useState(null);

    const highlightedIds = useMemo(() => {
        if (!hoveredMatchId) return new Set();
        const ids = new Set();
        const queue = [hoveredMatchId];

        // Fast lookup
        const matchMap = new Map(enrichedMatches.map(m => [m.id, m]));

        while (queue.length > 0) {
            const currId = queue.shift();
            // Avoid cycles (though unlikely in brackets)
            if (ids.has(currId)) continue;
            ids.add(currId);

            const curr = matchMap.get(currId);
            if (!curr) continue;

            if (curr.sourceMatchId1) queue.push(curr.sourceMatchId1);
            if (curr.sourceMatchId2) queue.push(curr.sourceMatchId2);
        }
        return ids;
    }, [hoveredMatchId, enrichedMatches]);

    // --- 2. Path Calculation ---
    useLayoutEffect(() => {
        if (!containerRef.current) return;

        const calcPaths = () => {
            const newPaths = [];
            const containerRect = containerRef.current.getBoundingClientRect();
            const scrollLeft = containerRef.current.scrollLeft;
            const scrollTop = containerRef.current.scrollTop;

            enrichedMatches.forEach(m => {
                const srcEl = matchRefs.current[m.id];
                if (!srcEl) return;
                const srcRect = srcEl.getBoundingClientRect();

                const startX = srcRect.right - containerRect.left + scrollLeft;
                const startY = srcRect.top - containerRect.top + scrollTop + (srcRect.height / 2);

                const isSrcHighlighted = highlightedIds.has(m.id);

                // Winner Path (Standard Right)
                if (m.nextMatchId) {
                    const destEl = matchRefs.current[m.nextMatchId];
                    if (destEl) {
                        const destRect = destEl.getBoundingClientRect();
                        const endX = destRect.left - containerRect.left + scrollLeft;
                        const endY = destRect.top - containerRect.top + scrollTop + (destRect.height / 2);
                        const midX = (startX + endX) / 2;

                        const isDestHighlighted = highlightedIds.has(m.nextMatchId);
                        const isPathHighlighted = isSrcHighlighted && isDestHighlighted;

                        newPaths.push({
                            id: `${m.id}-win`,
                            d: `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`,
                            color: isPathHighlighted ? '#fbbf24' : 'rgba(255,255,255,0.08)', // Gold if highlighted
                            width: isPathHighlighted ? 3 : 1,
                            zIndex: isPathHighlighted ? 100 : 0
                        });
                    }
                }

                // Consolation Path (Drop to LB/Placement)
                if (m.loserMatchId) {
                    const destEl = matchRefs.current[m.loserMatchId];
                    if (destEl) {
                        const destRect = destEl.getBoundingClientRect();
                        const endX = destRect.left - containerRect.left + scrollLeft;
                        const endY = destRect.top - containerRect.top + scrollTop + (destRect.height / 2);

                        // Standard Angular Drop
                        const midX = (startX + endX) / 2;

                        const isDestHighlighted = highlightedIds.has(m.loserMatchId);
                        const isPathHighlighted = isSrcHighlighted && isDestHighlighted;

                        newPaths.push({
                            id: `${m.id}-loss`,
                            d: `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`,
                            color: isPathHighlighted ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                            width: isPathHighlighted ? 2 : 1,
                            dash: '3 3',
                            zIndex: isPathHighlighted ? 100 : 0
                        });
                    }
                }
            });
            setPaths(newPaths);
        };
        const timer = requestAnimationFrame(calcPaths);
        return () => cancelAnimationFrame(timer);
    }, [matches.length, visibleSections.join(','), players.length, highlightedIds]); // Added highlightedIds dependency

    // --- 3. Render Match Card (Pink/Cyan Theme) ---
    const renderMatch = (match, customHeader = null) => {
        const p1 = match.player1;
        const p2 = match.player2;
        const isWinner1 = match.winnerId && match.winnerId === p1?.id;
        const isWinner2 = match.winnerId && match.winnerId === p2?.id;
        const isClickable = !readonly && onMatchClick && !match.player1?.isBye && !match.player2?.isBye;
        const showScore = match.status === 'finished' || (match.status === 'live' && (match.score1 > 0 || match.score2 > 0));

        const displayId = customHeader || getMatchNumber(match.id);
        const isLive = match.status === 'live';

        const isHighlighted = highlightedIds.has(match.id);

        // --- Court Display Logic ---
        // Map long Polish names to short codes if needed or just display
        let courtLabel = '';
        if (match.court) {
            if (match.court.includes('Różowy')) courtLabel = 'PINK';
            else if (match.court.includes('Turkusowy')) courtLabel = 'CYAN';
            else courtLabel = match.court;
        }

        const matchLabel = customHeader || getShortMatchId(match.id);

        // Theme Constants
        const COLOR_PINK = '#ec4899';
        const COLOR_CYAN = '#06b6d4';
        const COLOR_GOLD = '#fbbf24';

        // Background: Dark Glass
        let bgStyle = isLive
            ? 'linear-gradient(135deg, rgba(20, 20, 20, 0.95), rgba(0, 0, 0, 0.98))'
            : 'linear-gradient(180deg, rgba(20, 20, 20, 0.95) 0%, rgba(10, 10, 10, 0.98) 100%)';

        // Highlight Override
        if (isHighlighted) {
            bgStyle = 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(0, 0, 0, 0.9))';
        }

        // Border: Pink if live, else subtle grey
        let borderColor = isLive ? 'rgba(236, 72, 153, 0.6)' : 'rgba(255, 255, 255, 0.1)';
        let boxShadow = isLive ? '0 0 20px rgba(236, 72, 153, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.5)';

        if (isHighlighted) {
            borderColor = COLOR_GOLD;
            boxShadow = '0 0 15px rgba(251, 191, 36, 0.3)';
        }

        return (
            <div
                ref={el => matchRefs.current[match.id] = el}
                key={match.id}
                onClick={isClickable ? () => onMatchClick(match) : undefined}
                className={`match-card-themed ${isHighlighted ? 'highlighted' : ''}`}
                style={{
                    width: '200px',
                    flexShrink: 0,
                    background: bgStyle,
                    borderRadius: '12px',
                    border: `1px solid ${borderColor}`,
                    boxShadow: boxShadow,
                    transition: 'all 0.2s',
                    cursor: isClickable ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                    zIndex: isHighlighted ? 100 : 10,
                    fontSize: '0.75rem',
                    fontFamily: '"Inter", sans-serif',
                    overflow: 'hidden',
                    backdropFilter: 'blur(8px)',
                    transform: isHighlighted ? 'scale(1.02)' : 'none'
                }}
                onMouseEnter={(e) => {
                    setHoveredMatchId(match.id);
                    e.currentTarget.style.borderColor = isHighlighted ? COLOR_GOLD : (isLive ? COLOR_PINK : 'rgba(255, 255, 255, 0.4)');
                }}
                onMouseLeave={(e) => {
                    setHoveredMatchId(null);
                    e.currentTarget.style.borderColor = borderColor;
                }}
            >
                {/* Header: White text, very subtle divider */}
                <div style={{
                    padding: '8px 12px',
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.5)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{matchLabel}</span>
                        {courtLabel && (
                            <span style={{
                                color: courtLabel === 'PINK' ? COLOR_PINK : (courtLabel === 'CYAN' ? COLOR_CYAN : '#fff'),
                                fontSize: '0.6rem', border: '1px solid currentColor', borderRadius: '3px', padding: '0 3px'
                            }}>
                                {courtLabel}
                            </span>
                        )}
                    </div>
                    {isLive && <span style={{
                        background: COLOR_PINK, color: 'white', padding: '2px 6px',
                        borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800,
                        boxShadow: `0 0 8px ${COLOR_PINK}`
                    }}>LIVE</span>}
                </div>

                <div style={{ padding: '10px 0' }}>
                    {[
                        { p: p1, s: match.score1, w: isWinner1, srcId: match.sourceMatchId1, srcType: match.sourceType1 },
                        { p: p2, s: match.score2, w: isWinner2, srcId: match.sourceMatchId2, srcType: match.sourceType2 }
                    ].map((row, idx) => {
                        let displayText = 'TBD';
                        let isPlaceholder = false;

                        if (row.p) {
                            displayText = row.p.full_name;
                        } else {
                            // GENERATE INSTRUCTION TEXT
                            const sourceLabel = getShortMatchId(row.srcId);
                            if (sourceLabel) {
                                const type = row.srcType === 'loser' ? 'Loser' : 'Winner'; // Or polish "Przegrany"/"Wygrany"
                                displayText = `${type}: ${sourceLabel}`;
                                isPlaceholder = true;
                            } else {
                                displayText = 'Waiting...';
                                isPlaceholder = true;
                            }
                        }

                        // Text Color: White normally, Cyan if winner
                        let displayColor = row.p ? '#ffffff' : 'rgba(255,255,255,0.3)';

                        // Bold if winner
                        const fontWeight = row.w ? 700 : 400;
                        const opacity = (match.status === 'finished' && !row.w) ? 0.4 : 1;

                        return (
                            <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '4px 12px', opacity
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                    {/* Flag: specific dimensions for neatness */}
                                    {row.p && row.p.country && (
                                        <img
                                            src={`https://flagcdn.com/w20/${row.p.country.toLowerCase()}.png`}
                                            alt={row.p.country}
                                            style={{
                                                width: '16px', height: '12px',
                                                borderRadius: '2px', objectFit: 'cover',
                                                display: 'block',
                                                boxShadow: '0 0 2px rgba(0,0,0,0.5)'
                                            }}
                                            onError={(e) => { e.target.style.display = 'none' }}
                                        />
                                    )}
                                    <span style={{
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        color: displayColor,
                                        fontWeight: fontWeight,
                                        fontSize: isPlaceholder ? '0.7rem' : '0.85rem', // Smaller for instructions
                                        maxWidth: '120px',
                                        fontStyle: isPlaceholder ? 'italic' : 'normal'
                                    }}>
                                        {displayText}
                                    </span>
                                </div>
                                <span style={{
                                    fontWeight: 700,
                                    color: row.w ? COLOR_CYAN : 'rgba(255,255,255,0.2)', // Winner gets Cyan score
                                    fontSize: '0.9rem',
                                    fontFamily: 'monospace'
                                }}>
                                    {showScore ? (Number(row.s) || 0) : '-'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (!enrichedMatches || enrichedMatches.length === 0) {
        return <div style={{ color: '#fff', padding: '40px' }}>{t('brackets.noData') || 'No bracket data available.'}</div>;
    }

    // Styles for Section Headers using Pink/Cyan theme
    const sectionHeaderStyle = {
        color: '#ffffff',
        fontSize: '1.8rem',
        fontWeight: 900,
        marginBottom: '50px',
        letterSpacing: '-0.5px',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    };

    return (
        <div className="bracket-scroll-container" style={{ width: '100%', height: '100%', overflowX: 'auto', position: 'relative' }}>

            {/* SVG Connectors REMOVED per user request for clean look */}

            <div ref={containerRef} className="bracket-layout" style={{ display: 'flex', flexDirection: 'row', minWidth: 'max-content', minHeight: '100vh', padding: '60px' }}>

                {/* 1. Winners Bracket (Pink Theme) */}
                {visibleSections.includes('wb') && (
                    <div className="section-wb" style={{ display: 'flex', flexDirection: 'column', marginRight: '100px' }}>
                        <div style={sectionHeaderStyle}>
                            <div style={{ width: '6px', height: '32px', background: '#ec4899', borderRadius: '2px' }}></div>
                            <span>WINNERS BRACKET</span>
                        </div>
                        <div style={{ display: 'flex', gap: '80px' }}>
                            {wbRounds.map((roundMatches, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '20px' }}>
                                    {roundMatches.map(m => renderMatch(m))}
                                </div>
                            ))}
                            {visibleSections.includes('mid') && gfMatches.length > 0 && (
                                <div className="section-mid" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', marginLeft: '10px' }}>
                                    {gfMatches.map(m => renderMatch(m, m.id === 'grand-final' ? 'FINAL' : '3RD'))}
                                    <div style={{ alignSelf: 'center', opacity: 0.8, marginTop: '30px' }}>
                                        <Trophy size={80} color="#ec4899" style={{ filter: 'drop-shadow(0 0 15px rgba(236, 72, 153, 0.4))' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Losers Bracket (Cyan Theme) */}
                {visibleSections.includes('lb') && (
                    <div className="section-lb" style={{ display: 'flex', flexDirection: 'column', marginRight: '100px' }}>
                        <div style={sectionHeaderStyle}>
                            <div style={{ width: '6px', height: '32px', background: '#06b6d4', borderRadius: '2px' }}></div>
                            <span>LOSERS BRACKET</span>
                        </div>
                        <div style={{ display: 'flex', gap: '80px' }}>
                            {lbRounds.map((roundMatches, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '20px' }}>
                                    {roundMatches.map(m => renderMatch(m))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Placement Matches (White/Mixed) */}
                {(visibleSections.includes('lb') || visibleSections.includes('all') || visibleSections.includes('placement')) && (
                    <div className="section-monrad" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={sectionHeaderStyle}>
                            <div style={{ width: '6px', height: '32px', background: '#fff', borderRadius: '2px' }}></div>
                            <span>PLACEMENT STAGE</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '60px', maxWidth: '4000px' }}>
                            {monradConfig.map(group => {
                                let groupMatches = enrichedMatches.filter(m => group.brackets.some(b => m.bracket.startsWith(b)));
                                if (!groupMatches.length) return null;

                                const rounds = [];
                                groupMatches.forEach(m => {
                                    if (group.rounds && !group.rounds.includes(m.round)) return;
                                    if (!rounds[m.round]) rounds[m.round] = [];
                                    rounds[m.round].push(m);
                                });
                                if (group.rounds && Object.keys(rounds).length === 0) return null;

                                return (
                                    <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '180px', marginRight: '20px' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px' }}>{group.title.toUpperCase()}</div>
                                        <div style={{ display: 'flex', gap: '40px' }}>
                                            {rounds.map((rMatches, i) => rMatches && (
                                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}>
                                                    {rMatches.map(m => renderMatch(m, null))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BracketCanvas;
