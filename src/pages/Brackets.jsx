import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayers } from '../hooks/usePlayers';
import { useMatches } from '../hooks/useMatches';
import { generateDoubleEliminationBracket, updateBracketMatch } from '../utils/bracketLogic';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw, Save, RefreshCw, X, Trophy } from 'lucide-react';
import './Brackets.css';
import { useAuth } from '../hooks/useAuth.tsx';

const SCORE_MODAL_STYLES = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'
    },
    content: {
        background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', width: '300px',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)'
    }
};

const Brackets = () => {
    const { t } = useTranslation();
    const { players } = usePlayers();
    const { matches, saveMatches } = useMatches();
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [scoreA, setScoreA] = useState('');
    const [scoreB, setScoreB] = useState('');
    const { isAuthenticated } = useAuth();

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

    const handleGenerate = () => {
        if (!isAuthenticated) return;
        if (players.length < 2) {
            alert(t('matches.needPlayers'));
            return;
        }
        if (window.confirm(t('brackets.resetConfirm'))) {
            const newBracket = generateDoubleEliminationBracket(players);
            saveMatches(newBracket);
        }
    };

    const handleMatchClick = (match) => {
        if (!isAuthenticated) return;
        if (!match.player1Id || !match.player2Id) return;
        // We need to check isBye on the player objects
        if (match.player1?.isBye || match.player2?.isBye) return;

        setSelectedMatch(match);
        setScoreA(match.score1 ?? '');
        setScoreB(match.score2 ?? '');
    };

    const submitScore = (e) => {
        e.preventDefault();
        if (!selectedMatch) return;

        // Use raw matches for the update logic to avoid pollution?
        // updateBracketMatch rebuilds state.
        const updated = updateBracketMatch(matches, selectedMatch.id, scoreA, scoreB, selectedMatch.microPoints || [], players);
        saveMatches(updated);
        setSelectedMatch(null);
    };

    // --- RENDER HELPERS ---
    const renderMatch = (match) => {
        const p1 = match.player1;
        const p2 = match.player2;
        const isWinner1 = match.winnerId && match.winnerId === p1?.id;
        const isWinner2 = match.winnerId && match.winnerId === p2?.id;

        const style = isAuthenticated ? { cursor: 'pointer' } : { cursor: 'default' };
        const onClick = isAuthenticated ? () => handleMatchClick(match) : undefined;
        const title = isAuthenticated ? (match.id + " " + t('brackets.clickToEdit')) : match.id;

        // User request: "0:0 means match didn't happen". 
        // Hide score if pending/scheduled OR if live but score is 0-0.
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

    // Filter Matches
    const wbMatches = enrichedMatches.filter(m => m.bracket === 'wb');
    const lbMatches = enrichedMatches.filter(m => m.bracket === 'lb');
    const gfMatches = enrichedMatches.filter(m => m.bracket === 'gf');

    const wbRounds = [1, 2, 3, 4, 5].map(r => wbMatches.filter(m => m.round === r));
    const lbRounds = [1, 2, 3, 4, 5, 6, 7, 8].map(r => lbMatches.filter(m => m.round === r));

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 80px)', position: 'relative' }}>
            {/* Controls */}
            <div className="bracket-controls">
                {isAuthenticated && (
                    <button title={t('brackets.generateNew')} onClick={handleGenerate} className="btn-icon">
                        <RefreshCw size={18} />
                    </button>
                )}
            </div>

            <TransformWrapper
                initialScale={0.8}
                minScale={0.4}
                maxScale={2}
                centerOnInit={true}
                limitToBounds={false}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 100, display: 'flex', gap: '5px' }}>
                            <button className="btn-icon" onClick={() => zoomIn()}><ZoomIn size={18} /></button>
                            <button className="btn-icon" onClick={() => zoomOut()}><ZoomOut size={18} /></button>
                            <button className="btn-icon" onClick={() => resetTransform()}><RotateCcw size={18} /></button>
                        </div>

                        <TransformComponent wrapperClass="bracket-container" contentClass="bracket-canvas">
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
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>

            {/* Score Modal */}
            {selectedMatch && (
                <div style={SCORE_MODAL_STYLES.overlay} onClick={() => setSelectedMatch(null)}>
                    <div style={SCORE_MODAL_STYLES.content} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{t('brackets.editScoreTitle')}</h3>
                            <button onClick={() => setSelectedMatch(null)} className="close-button"><X size={20} /></button>
                        </div>
                        <div style={{ textAlign: 'center', marginBottom: '1rem', fontWeight: 600 }}>
                            {selectedMatch.player1?.full_name || 'TBD'} vs {selectedMatch.player2?.full_name || 'TBD'}
                        </div>
                        <form onSubmit={submitScore}>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Score P1</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={scoreA}
                                        onChange={e => setScoreA(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Score P2</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={scoreB}
                                        onChange={e => setScoreB(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                    <Save size={16} /> {t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Brackets;
