import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// We assume parent imports Brackets.css or we import it here
import '../pages/Brackets.css';
import RacketBadge from './RacketBadge';
import { getRacketPathConfig, getZoneConfig } from '../utils/racketPathUtils';
import { getBracketBlueprint } from '../utils/bracketLogic';

const BracketCanvas = ({ matches, players, onMatchClick, readonly = false, visibleSections = ['wb', 'mid', 'lb'] }) => {
    const { t } = useTranslation();

    // Enrich matches for display
    const enrichedMatches = useMemo(() => {
        const baseMatches = (matches && matches.length > 0) ? matches : getBracketBlueprint();
        const blueprint = getBracketBlueprint();
        const blueprintMap = new Map();
        blueprint.forEach(m => blueprintMap.set(m.id, m));

        return baseMatches.map(m => {
            const p1 = players.find(p => p.id === m.player1Id);
            const p2 = players.find(p => p.id === m.player2Id);

            const bp = blueprintMap.get(m.id);
            const sourceMatchId1 = m.sourceMatchId1 || (bp ? bp.sourceMatchId1 : null);
            const sourceType1 = m.sourceType1 || (bp ? bp.sourceType1 : null);
            const sourceMatchId2 = m.sourceMatchId2 || (bp ? bp.sourceMatchId2 : null);
            const sourceType2 = m.sourceType2 || (bp ? bp.sourceType2 : null);

            return {
                ...m,
                player1: p1 || null,
                player2: p2 || null,
                sourceMatchId1, sourceType1,
                sourceMatchId2, sourceType2
            };
        });
    }, [matches, players]);

    // Helper to extract match number for sorting
    const getMatchNumber = (id) => {
        const parts = id.split('-m');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
    };
    const byMatchId = (a, b) => getMatchNumber(a.id) - getMatchNumber(b.id);

    // Filter Matches
    const wbMatches = enrichedMatches.filter(m => m.bracket === 'wb');
    const lbMatches = enrichedMatches.filter(m => m.bracket === 'lb');
    const gfMatches = enrichedMatches.filter(m => m.bracket === 'gf').sort(byMatchId);

    const wbRounds = [1, 2, 3, 4, 5].map(r => wbMatches.filter(m => m.round === r).sort(byMatchId));
    const lbRounds = [1, 2, 3, 4, 5, 6, 7, 8].map(r => lbMatches.filter(m => m.round === r).sort(byMatchId));

    const renderMatch = (match, borderColor = null) => {
        const p1 = match.player1;
        const p2 = match.player2;
        const isWinner1 = match.winnerId && match.winnerId === p1?.id;
        const isWinner2 = match.winnerId && match.winnerId === p2?.id;

        const isClickable = !readonly && onMatchClick && !match.player1?.isBye && !match.player2?.isBye;
        const style = isClickable ? { cursor: 'pointer' } : { cursor: 'default' };
        if (borderColor) style.borderLeft = `3px solid ${borderColor}`;

        const onClick = isClickable ? () => onMatchClick(match) : undefined;

        // Zone Info
        const zone = getZoneConfig(match.bracket, match.round);
        const zoneTooltip = zone ? `\n[${zone.label}]\n🏆 Win: Advances\n💀 Loss: ${zone.places} Place` : '';
        const title = (match.id + " " + (isClickable ? t('brackets.clickToEdit') : '')) + zoneTooltip;

        const totalScore = (match.score1 || 0) + (match.score2 || 0);
        const showScore = match.status === 'finished' || (match.status === 'live' && totalScore > 0);

        // Readable Source Labels for TBD
        const getSourceLabel = (srcId, type) => {
            if (!srcId) return null;
            const parts = srcId.split('-');
            if (parts.length < 3) return null;
            const matchNum = parts[2].replace('m', '');
            const label = type === 'winner'
                ? t('brackets.sourceWinner', { n: matchNum })
                : t('brackets.sourceLoser', { n: matchNum });

            return (
                <span className="source-label" style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-tertiary)',
                    display: 'block',
                    lineHeight: '1.1',
                    marginTop: '2px',
                    fontStyle: 'italic',
                    opacity: 0.8
                }}>
                    {label}
                </span>
            );
        };

        // --- Racket Path Logic ---
        const renderRacketPath = (m) => {
            const mNum = getMatchNumber(m.id);
            const config = getRacketPathConfig(m.id, m.bracket, m.round, mNum);
            if (!config) return null;

            if (config.type === 'source') {
                return <RacketBadge colorKey={config.colorKey} text={config.text} isDual={config.isDual} />;
            }
            if (config.type === 'destination') {
                const hasBothPlayers = m.player1 && m.player2;
                if (!hasBothPlayers) {
                    return (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px', width: '100%' }}>
                            <RacketBadge colorKey={config.colorKey} text={config.text} isDual={config.isDual} />
                        </div>
                    );
                }
            }
            return null;
        };

        const racketBadgeSource = getRacketPathConfig(match.id, match.bracket, match.round, getMatchNumber(match.id))?.type === 'source' ? renderRacketPath(match) : null;
        const racketBadgeDest = getRacketPathConfig(match.id, match.bracket, match.round, getMatchNumber(match.id))?.type === 'destination' ? renderRacketPath(match) : null;

        return (
            <div
                key={match.id}
                className="match-block"
                onClick={onClick}
                title={title}
                style={style}
            >
                <div className="match-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{match.id.toUpperCase().replace('WB-', '').replace('LB-', '').replace('GF-', t('brackets.finalBadge') + ' ')}</span>
                    {racketBadgeSource}
                </div>

                {racketBadgeDest}

                <div className={`match-player ${isWinner1 ? 'winner' : ''}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <span className={`player-name ${!p1 ? 'placeholder' : ''}`}>
                            {p1 ? p1.full_name : 'TBD'}
                        </span>
                        {!p1 && getSourceLabel(match.sourceMatchId1, match.sourceType1)}
                    </div>
                    <span className="player-score">{showScore ? (match.score1 ?? 0) : '-'}</span>
                </div>
                <div className={`match-player ${isWinner2 ? 'winner' : ''}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <span className={`player-name ${!p2 ? 'placeholder' : ''}`}>
                            {p2 ? p2.full_name : 'TBD'}
                        </span>
                        {!p2 && getSourceLabel(match.sourceMatchId2, match.sourceType2)}
                    </div>
                    <span className="player-score">{showScore ? (match.score2 ?? 0) : '-'}</span>
                </div>
            </div>
        );
    };

    // Monrad Groups Configuration with Themes
    const monradGroups = [
        {
            id: 'p25_group',
            prefixes: ['p25', 'p27', 'p29', 'p31'],
            title: 'MIEJSCA 25-32',
            headers: ['ĆWIERĆFINAŁY 25-32', 'PÓŁFINAŁY 25-28 / 29-32', 'FINAŁY (25, 27, 29, 31)'],
            color: '#ef4444' // Red (from LB R1)
        },
        {
            id: 'p17_group',
            prefixes: ['p17', 'p19', 'p21', 'p23'],
            title: 'MIEJSCA 17-24',
            headers: ['ĆWIERĆFINAŁY 17-24', 'PÓŁFINAŁY 17-20 / 21-24', 'FINAŁY (17, 19, 21, 23)'],
            color: '#f97316' // Orange (from LB R2)
        },
        {
            id: 'p13_group',
            prefixes: ['p13', 'p15'],
            title: 'MIEJSCA 13-16',
            headers: ['PÓŁFINAŁY 13-16', 'FINAŁY (13, 15)'],
            color: '#eab308' // Yellow (from LB R3)
        },
        {
            id: 'p9_group',
            prefixes: ['p9', 'p11'],
            title: 'MIEJSCA 9-12',
            headers: ['PÓŁFINAŁY 9-12', 'FINAŁY (9, 11)'],
            color: '#84cc16' // Lime (from LB R4)
        }
    ];

    return (
        <div className="bracket-canvas">
            {/* Section A: Winners Bracket */}
            {visibleSections.includes('wb') && (
                <div className="bracket-section section-wb">
                    <div className="section-title wb-title">{t('brackets.wb')}</div>
                    <div className="bracket-rounds-container">
                        {wbRounds.map((roundMatches, i) => (
                            <div key={`wb-r${i}`} className="round-column">
                                <div className="round-header">{t('brackets.round')} {i + 1}</div>
                                {roundMatches.map(m => renderMatch(m))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section B: Finals / Mid */}
            {visibleSections.includes('mid') && (
                <div className="bracket-section section-mid">
                    <div className="section-title mid-title">{t('brackets.finals')}</div>
                    <div className="round-column" style={{ justifyContent: 'center' }}>
                        {gfMatches.map(m => renderMatch(m))}
                        <div style={{ textAlign: 'center', marginTop: '2rem', opacity: 0.5 }}>
                            <Trophy size={48} color="gold" />
                        </div>
                    </div>
                </div>
            )}

            {/* Section C: Losers Bracket */}
            {visibleSections.includes('lb') && (
                <div className="bracket-section section-lb">
                    <div className="section-title lb-title">{t('brackets.lb')}</div>
                    <div className="bracket-rounds-container">
                        {lbRounds.map((roundMatches, i) => {
                            const zone = getZoneConfig('lb', i + 1);
                            const wrapperStyle = zone ? {
                                border: `1px dashed ${zone.color}60`,
                                background: `linear-gradient(to bottom, ${zone.color}08, transparent)`,
                                borderRadius: '12px',
                                padding: '10px',
                                position: 'relative',
                                margin: '0 4px',
                                minWidth: '220px'
                            } : {};

                            return (
                                <div key={`lb-r${i}`} className="round-column" style={wrapperStyle}>
                                    {zone && (
                                        <div style={{
                                            position: 'absolute', top: '-12px', right: '10px',
                                            fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase',
                                            color: zone.color, background: 'var(--bg-card)',
                                            padding: '2px 8px', border: `1px solid ${zone.color}`, borderRadius: '20px',
                                            zIndex: 5, whiteSpace: 'nowrap',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }}>
                                            {zone.label}
                                        </div>
                                    )}
                                    <div className="round-header" style={{ marginBottom: zone ? '1rem' : '0.5rem' }}>
                                        LB {t('brackets.round')} {i + 1}
                                    </div>
                                    {roundMatches.map(m => renderMatch(m))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Section D: Placement (Monrad) */}
            {(visibleSections.includes('lb') || visibleSections.includes('all')) && (
                <div className="bracket-section section-placement" style={{ borderLeft: '1px dashed var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                    <div className="section-title mid-title">PLACEMENT (MONRAD)</div>
                    <div className="bracket-rounds-container" style={{ gap: '3rem' }}>

                        {monradGroups.map(group => {
                            let groupMatches = enrichedMatches.filter(m => group.prefixes.some(pre => m.bracket.startsWith(pre)));
                            if (groupMatches.length === 0) {
                                groupMatches = getBracketBlueprint()
                                    .filter(m => group.prefixes.some(pre => m.bracket.startsWith(pre)))
                                    .map(m => ({
                                        ...m,
                                        player1: null, player2: null,
                                        sourceMatchId1: m.sourceMatchId1, sourceType1: m.sourceType1,
                                        sourceMatchId2: m.sourceMatchId2, sourceType2: m.sourceType2,
                                        status: 'scheduled'
                                    }));
                            }
                            groupMatches.sort((a, b) => a.round - b.round || byMatchId(a, b));

                            const rounds = [];
                            groupMatches.forEach(m => {
                                if (!rounds[m.round]) rounds[m.round] = [];
                                rounds[m.round].push(m);
                            });

                            return (
                                <div key={group.id} style={{
                                    display: 'flex', flexDirection: 'column', gap: '1rem',
                                    border: `1px solid ${group.color}40`, // Source Theme Color
                                    borderLeft: `4px solid ${group.color}`,
                                    padding: '1.5rem', borderRadius: '8px',
                                    background: `linear-gradient(to right, ${group.color}05, transparent)`
                                }}>
                                    <div style={{
                                        fontWeight: 900, textAlign: 'center',
                                        color: group.color,
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px', fontSize: '1.1rem', marginBottom: '1rem'
                                    }}>
                                        {group.title}
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        {rounds.map((rMatches, idx) => rMatches && (
                                            <div key={idx} className="round-column" style={{ minWidth: '220px', gap: '1rem' }}>
                                                <div className="round-header" style={{ color: 'var(--text-secondary)' }}>
                                                    {group.headers[idx - 1] || `Runda ${idx}`}
                                                </div>
                                                {rMatches.map(m => renderMatch(m, group.color))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Singles (5-6, 7-8) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', justifyContent: 'center' }}>
                            {['p7', 'p5'].map(bid => {
                                const color = bid === 'p5' ? '#06b6d4' : '#22c55e'; // Cyan / Green
                                let m = enrichedMatches.find(x => x.bracket === bid);
                                if (!m) {
                                    const bp = getBracketBlueprint().find(x => x.bracket === bid);
                                    if (bp) m = { ...bp, player1: null, player2: null, status: 'scheduled' };
                                }

                                return m ? (
                                    <div key={bid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div className="round-header" style={{ color: color, fontWeight: 'bold' }}>
                                            {bid === 'p5' ? 'MIEJSCE 5' : 'MIEJSCE 7'}
                                        </div>
                                        {renderMatch(m, color)}
                                    </div>
                                ) : null;
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BracketCanvas;
