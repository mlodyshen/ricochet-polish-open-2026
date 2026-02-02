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
    const gfMatches = enrichedMatches.filter(m => m.bracket === 'gf' || m.bracket === 'p3').sort((a, b) => {
        if (a.bracket === 'gf' && b.bracket !== 'gf') return -1;
        return 0;
    });

    // Rounds - Aligning Columns
    const wbRounds = [1, 2, 3, 4, 5].map(r => wbMatches.filter(m => m.round === r).sort(byMatchId));
    const lbRounds = [1, 2, 3, 4, 5, 6, 7, 8].map(r => lbMatches.filter(m => m.round === r).sort(byMatchId));

    // Monrad Groups
    const monradConfig = [
        { id: '25-32', brackets: ['p25', 'p27', 'p29', 'p31'], title: 'Places 25-32' },
        { id: '17-24', brackets: ['p17', 'p19', 'p21', 'p23'], title: 'Places 17-32' },
        { id: '13-16', brackets: ['p13', 'p15'], title: 'Places 13-16' },
        { id: '9-12', brackets: ['p9', 'p11'], title: 'Places 9-16' },
        { id: '5-8', brackets: ['p5', 'p7'], title: 'Places 5-8' }
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

    // --- 3. Render Match Card ---
    const renderMatch = (match, customHeader = null) => {
        const p1 = match.player1;
        const p2 = match.player2;
        const isWinner1 = match.winnerId && match.winnerId === p1?.id;
        const isWinner2 = match.winnerId && match.winnerId === p2?.id;
        const isClickable = !readonly && onMatchClick && !match.player1?.isBye && !match.player2?.isBye;
        const showScore = match.status === 'finished' || (match.status === 'live' && (match.score1 > 0 || match.score2 > 0));

        // Styling for placement brackets
        const isPlacement = match.bracket.startsWith('p');
        const borderColor = isPlacement ? '#f97316' : racketCfg.color; // Orange for placement
        const glowColor = isPlacement ? '#f97316' : racketCfg.color;

        return (
            <div
                ref={el => matchRefs.current[match.id] = el}
                key={match.id}
                onClick={isClickable ? () => onMatchClick(match) : undefined}
                className="match-card-hover"
                style={{
                    width: '180px',
                    flexShrink: 0,
                    background: isPlacement ? 'rgba(249, 115, 22, 0.05)' : 'transparent',
                    borderLeft: `3px solid ${borderColor}`,
                    transition: 'all 0.3s ease',
                    cursor: isClickable ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                    zIndex: 10,
                    fontSize: '0.75rem',
                    fontFamily: '"Inter", sans-serif',
                    overflow: 'visible',
                    marginBottom: isPlacement ? '8px' : '0'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backdropFilter = 'blur(5px)';
                    e.currentTarget.style.boxShadow = `0 0 15px ${glowColor}20`; // subtle glow
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backdropFilter = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                <div style={{ paddingBottom: '4px', paddingTop: '4px' }}>
                    {[
                        { p: p1, s: match.score1, w: isWinner1, src: match.sourceMatchId1, type: match.sourceType1 },
                        { p: p2, s: match.score2, w: isWinner2, src: match.sourceMatchId2, type: match.sourceType2 }
                    ].map((row, idx) => {
                        // TBD Logic
                        let displayText = 'TBD';
                        let displayColor = 'rgba(255,255,255,0.2)';

                        if (row.p) {
                            displayText = row.p.full_name;
                            displayColor = '#ffffff';
                        } else if (row.src) {
                            const srcNum = getMatchNumber(row.src);
                            const prefix = row.type === 'loser' ? 'L' : 'W';
                            displayText = `${prefix}${srcNum}`;
                            displayColor = getSourceColor(row.src);
                        }

                        return (
                            <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '4px 12px',
                                background: 'transparent'
                            }}>
                                <span style={{
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    color: displayColor,
                                    fontWeight: 300,
                                    fontSize: '0.75rem',
                                    letterSpacing: '0.5px',
                                }}>
                                    {displayText}
                                </span>
                                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
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
        return <div style={{ color: '#fff', padding: '40px' }}>{t('brackets.noData') || 'No bracket data available. Please generate a new bracket.'}</div>;
    }

    return (
        <div className="bracket-scroll-container" style={{ width: '100%', height: '100%', overflowX: 'auto', background: '#09090b', position: 'relative' }}>
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '8000px', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
                {paths.map(p => (
                    <path key={p.id} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeDasharray={p.dash || 'none'} />
                ))}
            </svg>

            <div ref={containerRef} className="bracket-layout" style={{ display: 'flex', flexDirection: 'row', minWidth: 'max-content', minHeight: '100vh' }}>

                {/* 1. Winners Bracket */}
                {visibleSections.includes('wb') && (
                    <div className="section-wb" style={{ display: 'flex', flexDirection: 'column', padding: '40px', borderRight: '1px solid rgba(255,255,255,0.02)' }}>
                        <h2 style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 400, marginBottom: '60px', opacity: 0.3, letterSpacing: '4px', textTransform: 'uppercase' }}>Winners Bracket</h2>
                        <div style={{ display: 'flex', gap: '50px' }}>
                            {wbRounds.map((roundMatches, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '20px' }}>
                                    {roundMatches.map(m => renderMatch(m))}
                                </div>
                            ))}
                            {visibleSections.includes('mid') && gfMatches.length > 0 && (
                                <div className="section-mid" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', marginLeft: '10px' }}>
                                    {gfMatches.map(m => renderMatch(m, m.bracket === 'p3' ? '3RD' : 'FIN'))}
                                    <div style={{ alignSelf: 'center', opacity: 0.4 }}><Trophy size={48} color="#fbbf24" /></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Losers Bracket */}
                {visibleSections.includes('lb') && (
                    <div className="section-lb" style={{ display: 'flex', flexDirection: 'column', padding: '40px', borderRight: '1px solid rgba(255,255,255,0.02)' }}>
                        <h2 style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 400, marginBottom: '60px', opacity: 0.3, letterSpacing: '4px', textTransform: 'uppercase' }}>Losers Bracket</h2>
                        <div style={{ display: 'flex', gap: '50px' }}>
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
                    <div className="section-monrad" style={{ display: 'flex', flexDirection: 'column', padding: '40px' }}>
                        <h2 style={{ color: '#f97316', fontSize: '0.75rem', fontWeight: 700, marginBottom: '60px', opacity: 0.9, letterSpacing: '4px', textTransform: 'uppercase', textShadow: '0 0 20px rgba(249, 115, 22, 0.4)' }}>Placement Matches</h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '50px', maxWidth: '4000px' }}>
                            {monradConfig.map(group => {
                                let groupMatches = enrichedMatches.filter(m => group.brackets.some(b => m.bracket.startsWith(b)));
                                if (!groupMatches.length) {
                                    groupMatches = getBracketBlueprint().filter(m => group.brackets.some(b => m.bracket.startsWith(b)))
                                        .map(m => ({ ...m, player1: null, player2: null }));
                                }
                                if (!groupMatches.length) return null;
                                const rounds = [];
                                groupMatches.forEach(m => { if (!rounds[m.round]) rounds[m.round] = []; rounds[m.round].push(m); });
                                return (
                                    <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '180px', marginRight: '20px' }}>
                                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.65rem', opacity: 0.3, letterSpacing: '2px', marginBottom: '15px' }}>{group.title.toUpperCase()}</div>
                                        <div style={{ display: 'flex', gap: '30px' }}>
                                            {rounds.map((rMatches, i) => rMatches && (
                                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center' }}>
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
