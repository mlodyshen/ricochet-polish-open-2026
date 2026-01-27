import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// Dependencies
import '../pages/Brackets.css';
import RacketBadge from './RacketBadge';
import { getRacketPathConfig, getZoneConfig } from '../utils/racketPathUtils';
import { getBracketBlueprint } from '../utils/bracketLogic';

const BracketCanvas = ({ matches, players, onMatchClick, readonly = false, visibleSections = ['wb', 'mid', 'lb'] }) => {
    const { t } = useTranslation();

    // --- 1. Data Preparation ---
    const enrichedMatches = useMemo(() => {
        const baseMatches = (matches && matches.length > 0) ? matches : getBracketBlueprint();
        const blueprint = getBracketBlueprint();
        const blueprintMap = new Map();
        blueprint.forEach(m => blueprintMap.set(m.id, m));

        return baseMatches.map(m => {
            const p1 = players.find(p => p.id === m.player1Id);
            const p2 = players.find(p => p.id === m.player2Id);
            // Ensure we have source info for racket lines if needed, though we aren't drawing lines yet
            const bp = blueprintMap.get(m.id);
            return {
                ...m,
                player1: p1 || null,
                player2: p2 || null,
                sourceMatchId1: m.sourceMatchId1 || (bp ? bp.sourceMatchId1 : null),
                sourceMatchId2: m.sourceMatchId2 || (bp ? bp.sourceMatchId2 : null),
                sourceType1: m.sourceType1 || (bp ? bp.sourceType1 : null),
                sourceType2: m.sourceType2 || (bp ? bp.sourceType2 : null),
            };
        });
    }, [matches, players]);

    const getMatchNumber = (id) => {
        const parts = id.split('-m');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
    };
    const byMatchId = (a, b) => getMatchNumber(a.id) - getMatchNumber(b.id);

    // Filter Sections
    const wbMatches = enrichedMatches.filter(m => m.bracket === 'wb');
    const lbMatches = enrichedMatches.filter(m => m.bracket === 'lb');
    const gfMatches = enrichedMatches.filter(m => m.bracket === 'gf').sort(byMatchId);

    // Group by Rounds
    const wbRounds = [1, 2, 3, 4, 5].map(r => wbMatches.filter(m => m.round === r).sort(byMatchId));
    const lbRounds = [1, 2, 3, 4, 5, 6, 7, 8].map(r => lbMatches.filter(m => m.round === r).sort(byMatchId));

    // --- 2. Render Match Card (Glassmorphism) ---
    const renderMatch = (match, customHeader = null, width = '220px') => {
        const p1 = match.player1;
        const p2 = match.player2;
        const isWinner1 = match.winnerId && match.winnerId === p1?.id;
        const isWinner2 = match.winnerId && match.winnerId === p2?.id;
        const isClickable = !readonly && onMatchClick && !match.player1?.isBye && !match.player2?.isBye;

        const totalScore = (match.score1 || 0) + (match.score2 || 0);
        const showScore = match.status === 'finished' || (match.status === 'live' && totalScore > 0);

        // Racket Path Logic
        const mNum = getMatchNumber(match.id);
        const pathCfg = getRacketPathConfig(match.id, match.bracket, match.round, mNum);

        let racketSource = null;
        let racketDest = null;

        if (pathCfg) {
            if (pathCfg.type === 'source') {
                racketSource = <RacketBadge colorKey={pathCfg.colorKey} text={pathCfg.text} isDual={pathCfg.isDual} />;
            } else if (pathCfg.type === 'destination' && (!p1 || !p2)) {
                // Centered badminton icon for destinations
                racketDest = (
                    <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                        <RacketBadge colorKey={pathCfg.colorKey} text={pathCfg.text} isDual={pathCfg.isDual} />
                    </div>
                );
            }
        }

        const matchIdLabel = match.id.toUpperCase()
            .replace('WB-', '')
            .replace('LB-', 'LB ')
            .replace('GF-', 'FIN ')
            .replace('-M', '#');

        // Monrad Labels
        let displayHeader = customHeader || matchIdLabel;

        return (
            <div
                key={match.id}
                onClick={isClickable ? () => onMatchClick(match) : undefined}
                style={{
                    position: 'relative',
                    width: width,
                    background: 'rgba(30, 32, 44, 0.6)', /* Darker, nice glass */
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                    cursor: isClickable ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'visible', /* Allow racket badge to pop out */
                    marginTop: racketDest ? '10px' : '0',
                    transition: 'border-color 0.2s'
                }}
                className="glass-match-card"
                title={match.bracket}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 10px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '0.7rem',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                }}>
                    <span>{displayHeader}</span>
                    {racketSource}
                </div>

                {racketDest}

                {/* Players */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Player 1 */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 10px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isWinner1 ? 'rgba(34, 197, 94, 0.15)' : 'transparent'
                    }}>
                        <span style={{
                            fontSize: '0.85rem',
                            fontWeight: isWinner1 ? 600 : 400,
                            color: p1 ? (isWinner1 ? '#86efac' : '#e5e7eb') : 'rgba(255,255,255,0.25)',
                            fontStyle: p1 ? 'normal' : 'italic',
                            maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                            {p1 ? p1.full_name : 'TBD'}
                        </span>
                        <span style={{ fontWeight: 700, color: isWinner1 ? '#86efac' : 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                            {showScore ? (match.score1 ?? 0) : '-'}
                        </span>
                    </div>

                    {/* Player 2 */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 10px',
                        background: isWinner2 ? 'rgba(34, 197, 94, 0.15)' : 'transparent'
                    }}>
                        <span style={{
                            fontSize: '0.85rem',
                            fontWeight: isWinner2 ? 600 : 400,
                            color: p2 ? (isWinner2 ? '#86efac' : '#e5e7eb') : 'rgba(255,255,255,0.25)',
                            fontStyle: p2 ? 'normal' : 'italic',
                            maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                            {p2 ? p2.full_name : 'TBD'}
                        </span>
                        <span style={{ fontWeight: 700, color: isWinner2 ? '#86efac' : 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                            {showScore ? (match.score2 ?? 0) : '-'}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    // --- 3. Monrad Configuration ---
    const monradConfig = [
        { id: '25-32', brackets: ['p25', 'p27', 'p29', 'p31'], title: 'Places 25-32', color: '#ef4444' },
        { id: '17-24', brackets: ['p17', 'p19', 'p21', 'p23'], title: 'Places 17-24', color: '#f97316' },
        { id: '13-16', brackets: ['p13', 'p15'], title: 'Places 13-16', color: '#eab308' },
        { id: '9-12', brackets: ['p9', 'p11'], title: 'Places 9-12', color: '#84cc16' }
    ];

    // --- 4. Main Render ---
    return (
        <div className="bracket-canvas" style={{
            background: 'linear-gradient(135deg, #111827 0%, #1e1b4b 100%)', // Slate to Indigo Dark
            minHeight: '100vh',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '4rem'
        }}>

            {/* --- TOP SECTION: WB & FINALS --- */}
            <div className="section-wb" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="section-title" style={{
                    color: '#ec4899', marginBottom: '1.5rem', marginLeft: '1rem', textAlign: 'left',
                    fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9
                }}>
                    Winners Bracket
                </div>
                <div className="bracket-rounds-container" style={{ display: 'flex', gap: '3rem' }}>
                    {wbRounds.map((roundMatches, i) => (
                        <div key={i} className="round-column" style={{
                            display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'space-around'
                        }}>
                            <div className="round-header" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: '0.8rem' }}>ROUND {i + 1}</div>
                            {roundMatches.map(m => renderMatch(m))}
                        </div>
                    ))}

                    {/* Finals */}
                    {visibleSections.includes('mid') && gfMatches.length > 0 && (
                        <div className="round-column" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginLeft: '2rem' }}>
                            <div className="round-header" style={{ textAlign: 'center', color: '#fbbf24', fontWeight: 700, fontSize: '0.8rem' }}>CHAMPIONSHIP</div>
                            {gfMatches.map(m => renderMatch(m, "GRAND FINAL"))}
                            <div style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.5 }}>
                                <Trophy size={40} color="#fbbf24" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MIDDLE SECTION: LB --- */}
            {visibleSections.includes('lb') && (
                <div className="section-lb" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="section-title" style={{
                        color: '#f97316', marginBottom: '1.5rem', marginLeft: '1rem', textAlign: 'left',
                        fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9
                    }}>
                        Losers Bracket
                    </div>
                    <div className="bracket-rounds-container" style={{ display: 'flex', gap: '3rem' }}>
                        {lbRounds.map((roundMatches, i) => (
                            <div key={i} className="round-column" style={{
                                display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'space-around'
                            }}>
                                <div className="round-header" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: '0.8rem' }}>LB ROUND {i + 1}</div>
                                {roundMatches.map(m => renderMatch(m))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- BOTTOM SECTION: MONRAD --- */}
            {(visibleSections.includes('lb') || visibleSections.includes('all')) && (
                <div className="section-monrad" style={{
                    display: 'flex', flexDirection: 'column',
                    marginTop: '2rem',
                    borderTop: '1px dashed rgba(255,255,255,0.1)',
                    paddingTop: '3rem'
                }}>
                    <div className="section-title" style={{
                        color: '#94a3b8', marginBottom: '2rem', marginLeft: '1rem', textAlign: 'left',
                        fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9
                    }}>
                        Placement Matches (Monrad)
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem' }}>
                        {monradConfig.map(group => {
                            let groupMatches = enrichedMatches.filter(m => group.brackets.some(b => m.bracket.startsWith(b)));
                            // Fallback
                            if (groupMatches.length === 0) {
                                groupMatches = getBracketBlueprint()
                                    .filter(m => group.brackets.some(b => m.bracket.startsWith(b)))
                                    .map(m => ({ ...m, player1: null, player2: null }));
                            }
                            if (groupMatches.length === 0) return null;

                            // Organize by round
                            const rounds = [];
                            groupMatches.forEach(m => {
                                if (!rounds[m.round]) rounds[m.round] = [];
                                rounds[m.round].push(m);
                            });

                            return (
                                <div key={group.id} style={{
                                    display: 'flex', flexDirection: 'column', gap: '1rem',
                                    minWidth: '220px',
                                    borderLeft: `2px solid ${group.color}`,
                                    paddingLeft: '1rem'
                                }}>
                                    <div style={{ color: group.color, fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.9rem' }}>{group.title.toUpperCase()}</div>
                                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                                        {rounds.map((rMatches, rId) => rMatches && (
                                            <div key={rId} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {rMatches.map(m => renderMatch(m, null, '200px'))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Singles */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '200px', borderLeft: '2px solid #22c55e', paddingLeft: '1rem' }}>
                            <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.9rem' }}>FINAL PLACEMENTS</div>
                            {['p7', 'p5'].map(bid => {
                                let m = enrichedMatches.find(x => x.bracket === bid);
                                if (!m) m = { ...getBracketBlueprint().find(x => x.bracket === bid), player1: null, player2: null };
                                return m ? renderMatch(m, bid === 'p5' ? '5TH PLACE' : '7TH PLACE', '200px') : null;
                            })}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default BracketCanvas;
