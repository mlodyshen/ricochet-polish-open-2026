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
                sourceType1: m.sourceType1 || (bp ? bp.sourceType1 : null),
                sourceType2: m.sourceType2 || (bp ? bp.sourceType2 : null),
                nextMatchId: m.nextMatchId || (bp ? bp.nextMatchId : null),
                loserMatchId: m.loserMatchId || (bp ? bp.loserMatchId : null),
                court: m.court // Ensure court is passed through
            };
        });
    }, [matches, players]);

    // --- 4. Interactive Highlight (Path to Final) ---
    const [hoveredMatchId, setHoveredMatchId] = useState(null);
    const [paths, setPaths] = useState([]);

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

    const getMatchNumber = (id) => {
        if (!id || typeof id !== 'string') return 0;
        const parts = id.split('-m');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
    };

    const getShortMatchId = (id) => {
        if (!id) return '';
        const parts = id.split('-');
        if (parts.length < 3) return id;
        const b = parts[0].toUpperCase();
        const r = parts[1].replace('r', '');
        const m = parts[2].replace('m', '');
        if (b === 'P25') return `25-32 #1.${m}`;
        return `${b} ${r}.${m}`;
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
        { id: '25-32', brackets: ['p25', 'p27', 'p29', 'p31'], title: t('brackets.placeRange', { range: '25-32' }) },
        { id: '17-24', brackets: ['p17', 'p19', 'p21', 'p23'], title: t('brackets.placeRange', { range: '17-24' }) },
        { id: '13-16', brackets: ['p13', 'p15'], title: t('brackets.placeRange', { range: '13-16' }) },
        { id: '9-12', brackets: ['p9', 'p11'], title: t('brackets.placeRange', { range: '9-12' }) },
        { id: '7-8', brackets: ['p7'], title: t('brackets.placeSingle', { place: '7th' }) },
        { id: '5-6', brackets: ['p5'], title: t('brackets.placeSingle', { place: '5th' }) },
        { id: '4th', brackets: ['p4'], title: t('brackets.placeSingle', { place: '4th' }) }
    ];

    // --- 2. Path Calculation (REMOVED) ---
    // Path calculation logic has been removed as per user request to hide lines.

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


        const matchLabel = customHeader || getShortMatchId(match.id);

        // Theme Constants
        const COLOR_PINK = 'var(--accent-pink)';
        const COLOR_CYAN = 'var(--accent-cyan)';
        const COLOR_GOLD = '#fbbf24';

        // Background: Dynamic Glass Tints
        // Standard background for all matches (no red tint for live)
        let bgStyle = 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)';

        // Highlight Override
        if (isHighlighted) {
            bgStyle = 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05))'; // Gold tint
        }

        // Border: Pink if live, else subtle grey
        // Border: Pink if live, else subtle grey
        // Border: Standard border, no live highlight
        let borderColor = 'var(--border-color)';
        let boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';

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
                    e.currentTarget.style.borderColor = isHighlighted ? COLOR_GOLD : (isLive ? COLOR_PINK : 'var(--accent-cyan)');
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
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{matchLabel}</span>

                    </div>

                </div>

                <div style={{ padding: '10px 0' }}>
                    {[
                        { p: p1, s: match.score1, w: isWinner1, srcId: match.sourceMatchId1, srcType: match.sourceType1 },
                        { p: p2, s: match.score2, w: isWinner2, srcId: match.sourceMatchId2, srcType: match.sourceType2 }
                    ].map((row, idx) => {
                        let displayText = 'TBD';
                        let isPlaceholder = false;

                        if (row.p) {
                            const fullName = row.p.full_name || "";
                            // Basic heuristic: Assume "Surname Name" storage from PlayerFormModal
                            // We want "N. Surname"
                            const parts = fullName.trim().split(" ");
                            if (parts.length >= 2) {
                                const surname = parts[0];
                                const firstName = parts.slice(1).join(" "); // Everything after first word
                                if (firstName) {
                                    displayText = `${firstName.charAt(0)}. ${surname}`;
                                } else {
                                    displayText = fullName;
                                }
                            } else {
                                displayText = fullName;
                            }
                        } else {
                            // GENERATE INSTRUCTION TEXT
                            const sourceLabel = getShortMatchId(row.srcId);
                            if (sourceLabel) {
                                const typeText = row.srcType === 'loser'
                                    ? t('brackets.sourceLoser', { n: sourceLabel })
                                    : t('brackets.sourceWinner', { n: sourceLabel });
                                displayText = typeText;
                                isPlaceholder = true;
                            } else {
                                displayText = t('live.waitingMessage'); // Or specific bracket wait message
                                isPlaceholder = true;
                            }
                        }

                        // Text Color: Dark normally
                        let displayColor = row.p ? 'var(--text-primary)' : 'var(--text-tertiary)';

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
                                    color: row.w ? COLOR_CYAN : 'var(--text-tertiary)', // Winner gets Cyan score
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
        return <div style={{ color: 'var(--text-primary)', padding: '40px' }}>{t('brackets.noData') || 'No bracket data available.'}</div>;
    }

    // Styles for Section Headers using Pink/Cyan theme
    const sectionHeaderStyle = {
        color: 'var(--text-primary)',
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

            <div ref={containerRef} className="bracket-layout" style={{ display: 'flex', flexDirection: 'row', minWidth: 'max-content', minHeight: '100vh' }}>

                {/* 1. Winners Bracket (Pink Theme) */}
                {visibleSections.includes('wb') && (
                    <div className="section-wb" style={{ display: 'flex', flexDirection: 'column', marginRight: '100px' }}>
                        <div style={sectionHeaderStyle}>
                            <div style={{ width: '6px', height: '32px', background: 'var(--accent-pink)', borderRadius: '2px' }}></div>
                            <span>{t('brackets.headerWB')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '80px' }}>
                            {wbRounds.map((roundMatches, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '20px' }}>
                                    {roundMatches.map(m => renderMatch(m))}
                                </div>
                            ))}
                            {visibleSections.includes('mid') && gfMatches.length > 0 && (
                                <div className="section-mid" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', marginLeft: '10px' }}>
                                    {gfMatches.map(m => renderMatch(m, m.id === 'grand-final' ? t('brackets.finalBadge').toUpperCase() : '3RD'))}
                                    <div style={{ alignSelf: 'center', opacity: 0.8, marginTop: '30px' }}>
                                        <Trophy size={80} color="var(--accent-pink)" style={{ filter: 'drop-shadow(0 0 15px rgba(220, 38, 38, 0.2))' }} />
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
                            <div style={{ width: '6px', height: '32px', background: 'var(--accent-cyan)', borderRadius: '2px' }}></div>
                            <span>{t('brackets.headerLB')}</span>
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
                            <div style={{ width: '6px', height: '32px', background: 'var(--text-secondary)', borderRadius: '2px' }}></div>
                            <span>{t('brackets.headerPlacement')}</span>
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
                                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px' }}>{group.title.toUpperCase()}</div>
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
