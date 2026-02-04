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
    const [paths, setPaths] = useState([]);

    // --- 1. Data Preparation ---
    const enrichedMatches = useMemo(() => {
        const baseMatches = (matches && matches.length > 0) ? matches : getBracketBlueprint();
        const blueprint = getBracketBlueprint();
        const blueprintMap = new Map();
        blueprint.forEach(m => blueprintMap.set(m.id, m));

        return baseMatches.map(m => {
            const bp = blueprintMap.get(m.id);
            return {
                ...m,
                player1: players.find(p => p.id === m.player1Id) || null,
                player2: players.find(p => p.id === m.player2Id) || null,
                sourceMatchId1: m.sourceMatchId1 || (bp ? bp.sourceMatchId1 : null),
                sourceMatchId2: m.sourceMatchId2 || (bp ? bp.sourceMatchId2 : null),
                nextMatchId: m.nextMatchId || (bp ? bp.nextMatchId : null),
                loserMatchId: m.loserMatchId || (bp ? bp.loserMatchId : null)
            };
        });
    }, [matches, players]);

    const getMatchNumber = (id) => {
        if (!id || typeof id !== 'string') return 0;
        const parts = id.split('-m');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
    };
    const byMatchId = (a, b) => getMatchNumber(a?.id) - getMatchNumber(b?.id);

    // Grouping
    const wbMatches = enrichedMatches.filter(m => m.bracket === 'wb');
    const lbMatches = enrichedMatches.filter(m => m.bracket === 'lb');
    const gfMatches = enrichedMatches.filter(m => m.bracket === 'gf').sort((a, b) => {
        return a.round - b.round;
    });

    // Rounds - Aligning Columns
    const wbRounds = [1, 2, 3, 4, 5].map(r => wbMatches.filter(m => m.round === r).sort(byMatchId));
    const lbRounds = [1, 2, 3, 4, 5, 6, 7, 8].map(r => lbMatches.filter(m => m.round === r).sort(byMatchId));

    // Monrad Groups
    const monradConfig = [
        { id: '25-32', brackets: ['p25', 'p27', 'p29', 'p31'], title: 'Places 25-32' },
        { id: '17-24', brackets: ['p17', 'p19', 'p21', 'p23'], title: 'Places 17-24' },
        { id: '13-16', brackets: ['p13', 'p15'], title: 'Places 13-16' },
        { id: '9-12', brackets: ['p9', 'p11'], title: 'Places 9-12' },
        { id: '7-8', brackets: ['p7'], title: '7th Place' },
        { id: '5-6', brackets: ['p5'], title: '5th Place' },
        { id: '4th', brackets: ['p4'], title: '4th Place' }
    ];

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

                // Winner Path (Standard Right)
                if (m.nextMatchId) {
                    const destEl = matchRefs.current[m.nextMatchId];
                    if (destEl) {
                        const destRect = destEl.getBoundingClientRect();
                        const endX = destRect.left - containerRect.left + scrollLeft;
                        const endY = destRect.top - containerRect.top + scrollTop + (destRect.height / 2);
                        const midX = (startX + endX) / 2;
                        newPaths.push({
                            id: `${m.id}-win`,
                            d: `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`,
                            color: 'rgba(255,255,255,0.08)', width: 1
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

                        newPaths.push({
                            id: `${m.id}-loss`,
                            d: `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`,
                            color: 'rgba(255,255,255,0.08)', width: 1, dash: '3 3'
                        });
                    }
                }
            });
            setPaths(newPaths);
        };
        const timer = requestAnimationFrame(calcPaths);
        return () => cancelAnimationFrame(timer);
    }, [matches.length, visibleSections.join(','), players.length]);

    // --- 3. Render Match Card (Solid Block Design) ---
    const renderMatch = (match, customHeader = null) => {
        const p1 = match.player1;
        const p2 = match.player2;
        const isWinner1 = match.winnerId && match.winnerId === p1?.id;
        const isWinner2 = match.winnerId && match.winnerId === p2?.id;
        const isClickable = !readonly && onMatchClick && !match.player1?.isBye && !match.player2?.isBye;
        const showScore = match.status === 'finished' || (match.status === 'live' && (match.score1 > 0 || match.score2 > 0));

        const displayId = customHeader || getMatchNumber(match.id);
        const isPlacement = match.bracket.startsWith('p');

        // Solid Block Style: No borders, use background contrast
        const bgStyle = isPlacement
            ? 'linear-gradient(145deg, #1e1e1e, #141414)'
            : 'linear-gradient(145deg, #27272a, #18181b)';

        return (
            <div
                ref={el => matchRefs.current[match.id] = el}
                key={match.id}
                onClick={isClickable ? () => onMatchClick(match) : undefined}
                className="match-card-solid"
                style={{
                    width: '180px',
                    flexShrink: 0,
                    background: bgStyle,
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
                    transition: 'transform 0.2s',
                    cursor: isClickable ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                    zIndex: 10,
                    fontSize: '0.75rem',
                    fontFamily: '"Inter", sans-serif',
                    overflow: 'hidden',
                    // No border!
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.6)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)';
                }}
            >
                {/* Header built into the block */}
                <div style={{
                    padding: '6px 10px',
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.4)',
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex', justifyContent: 'space-between',
                    fontWeight: 600
                }}>
                    <span>{match.bracket.toUpperCase()} #{displayId}</span>
                    {match.status === 'live' && <span style={{ color: '#ef4444' }}>LIVE</span>}
                </div>

                <div style={{ padding: '8px 4px' }}>
                    {[
                        { p: p1, s: match.score1, w: isWinner1 },
                        { p: p2, s: match.score2, w: isWinner2 }
                    ].map((row, idx) => {
                        let displayText = row.p ? row.p.full_name : 'TBD';
                        let displayColor = row.p ? '#e4e4e7' : 'rgba(255,255,255,0.2)';
                        const fontWeight = row.w ? 700 : 400;
                        // Reduce opacity for loser if match finished
                        const opacity = (match.status === 'finished' && !row.w) ? 0.4 : 1;

                        return (
                            <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '3px 8px', opacity
                            }}>
                                <span style={{
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    color: displayColor,
                                    fontWeight: fontWeight,
                                    fontSize: '0.8rem',
                                    maxWidth: '125px'
                                }}>
                                    {displayText}
                                </span>
                                <span style={{ fontWeight: 700, color: row.w ? '#4ade80' : 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>
                                    {showScore ? (Number(row.s) || 0) : ''}
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

    // Styles for Section Headers
    const sectionHeaderStyle = {
        color: '#ffffff',
        fontSize: '1.5rem',
        fontWeight: 800,
        marginBottom: '40px',
        opacity: 0.8,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        borderBottom: '2px solid rgba(255,255,255,0.1)',
        paddingBottom: '10px',
        width: 'fit-content'
    };

    return (
        <div className="bracket-scroll-container" style={{ width: '100%', height: '100%', overflowX: 'auto', background: '#0e0e11', position: 'relative' }}>

            {/* SVG Connectors - restored but cleaner */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '8000px', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
                {paths.map(p => (
                    <path key={p.id} d={p.d} stroke="rgba(255,255,255,0.1)" strokeWidth={2} fill="none" strokeDasharray={p.dash || 'none'} />
                ))}
            </svg>

            <div ref={containerRef} className="bracket-layout" style={{ display: 'flex', flexDirection: 'row', minWidth: 'max-content', minHeight: '100vh', padding: '60px' }}>

                {/* 1. Winners Bracket */}
                {visibleSections.includes('wb') && (
                    <div className="section-wb" style={{ display: 'flex', flexDirection: 'column', marginRight: '100px' }}>
                        <h2 style={sectionHeaderStyle}>Winners Bracket</h2>
                        <div style={{ display: 'flex', gap: '80px' }}>
                            {wbRounds.map((roundMatches, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '20px' }}>
                                    {roundMatches.map(m => renderMatch(m))}
                                </div>
                            ))}
                            {visibleSections.includes('mid') && gfMatches.length > 0 && (
                                <div className="section-mid" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', marginLeft: '10px' }}>
                                    {gfMatches.map(m => renderMatch(m, m.id === 'grand-final' ? 'FINAL' : '3RD'))}
                                    <div style={{ alignSelf: 'center', opacity: 0.2, marginTop: '20px' }}><Trophy size={64} color="#fbbf24" /></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Losers Bracket */}
                {visibleSections.includes('lb') && (
                    <div className="section-lb" style={{ display: 'flex', flexDirection: 'column', marginRight: '100px' }}>
                        <h2 style={{ ...sectionHeaderStyle, color: '#f97316' }}>Losers Bracket</h2>
                        <div style={{ display: 'flex', gap: '80px' }}>
                            {lbRounds.map((roundMatches, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '20px' }}>
                                    {roundMatches.map(m => renderMatch(m))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Placement Matches */}
                {(visibleSections.includes('lb') || visibleSections.includes('all') || visibleSections.includes('placement')) && (
                    <div className="section-monrad" style={{ display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ ...sectionHeaderStyle, color: '#3b82f6' }}>Placement Stage</h2>
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
                                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px' }}>{group.title.toUpperCase()}</div>
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
