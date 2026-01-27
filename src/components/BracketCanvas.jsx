import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// We assume parent imports Brackets.css or we import it here
import '../pages/Brackets.css';

const BracketCanvas = ({ matches, players, onMatchClick, readonly = false }) => {
    const { t } = useTranslation();

    // Enrich matches for display
    const enrichedMatches = useMemo(() => {
        if (!matches) return [];
        return matches.map(m => {
            const p1 = players.find(p => p.id === m.player1Id);
            const p2 = players.find(p => p.id === m.player2Id);
            return {
                ...m,
                player1: p1 || null,
                player2: p2 || null
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

    const renderMatch = (match) => {
        const p1 = match.player1;
        const p2 = match.player2;
        const isWinner1 = match.winnerId && match.winnerId === p1?.id;
        const isWinner2 = match.winnerId && match.winnerId === p2?.id;

        const isClickable = !readonly && onMatchClick && !match.player1?.isBye && !match.player2?.isBye;
        const style = isClickable ? { cursor: 'pointer' } : { cursor: 'default' };
        const onClick = isClickable ? () => onMatchClick(match) : undefined;
        // If readonly (Live view), we might want a different title or none
        const title = isClickable ? (match.id + " " + t('brackets.clickToEdit')) : match.id;

        const totalScore = (match.score1 || 0) + (match.score2 || 0);
        const showScore = match.status === 'finished' || (match.status === 'live' && totalScore > 0);

        return (
            <div
                key={match.id}
                className="match-block"
                onClick={onClick}
                title={title}
                style={style}
            >
                <div className="match-header">
                    <span>{match.id.toUpperCase().replace('WB-', '').replace('LB-', '').replace('GF-', t('brackets.finalBadge') + ' ')}</span>
                </div>
                <div className={`match-player ${isWinner1 ? 'winner' : ''}`}>
                    <span className={`player-name ${!p1 ? 'placeholder' : ''}`}>
                        {p1 ? p1.full_name : 'TBD'}
                    </span>
                    <span className="player-score">{showScore ? (match.score1 ?? 0) : '-'}</span>
                </div>
                <div className={`match-player ${isWinner2 ? 'winner' : ''}`}>
                    <span className={`player-name ${!p2 ? 'placeholder' : ''}`}>
                        {p2 ? p2.full_name : 'TBD'}
                    </span>
                    <span className="player-score">{showScore ? (match.score2 ?? 0) : '-'}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="bracket-canvas">
            {/* Section A: Winners Bracket */}
            <div className="bracket-section section-wb">
                <div className="section-title wb-title">{t('brackets.wb')}</div>
                <div className="bracket-rounds-container">
                    {wbRounds.map((roundMatches, i) => (
                        <div key={`wb-r${i}`} className="round-column">
                            <div className="round-header">{t('brackets.round')} {i + 1}</div>
                            {roundMatches.map(renderMatch)}
                        </div>
                    ))}
                </div>
            </div>

            {/* Section B: Finals / Mid */}
            <div className="bracket-section section-mid">
                <div className="section-title mid-title">{t('brackets.finals')}</div>
                <div className="round-column" style={{ justifyContent: 'center' }}>
                    {gfMatches.map(renderMatch)}
                    <div style={{ textAlign: 'center', marginTop: '2rem', opacity: 0.5 }}>
                        <Trophy size={48} color="gold" />
                    </div>
                </div>
            </div>

            {/* Section C: Losers Bracket */}
            <div className="bracket-section section-lb">
                <div className="section-title lb-title">{t('brackets.lb')}</div>
                <div className="bracket-rounds-container">
                    {lbRounds.map((roundMatches, i) => (
                        <div key={`lb-r${i}`} className="round-column">
                            <div className="round-header">LB {t('brackets.round')} {i + 1}</div>
                            {roundMatches.map(renderMatch)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BracketCanvas;
