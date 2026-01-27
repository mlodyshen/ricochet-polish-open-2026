import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayers } from '../hooks/usePlayers';
import { useMatches } from '../hooks/useMatches';
import { generateDoubleEliminationBracket, updateBracketMatch } from '../utils/bracketLogic';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw, Save, RefreshCw, X } from 'lucide-react';
import './Brackets.css';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTournament } from '../contexts/TournamentContext';
import BracketCanvas from '../components/BracketCanvas';

const SCORE_MODAL_STYLES = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    content: {
        backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px',
        width: '90%', maxWidth: '400px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
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
    const { activeTournamentId, updateTournament } = useTournament();

    const handleGenerate = async () => {
        if (!isAuthenticated) return;
        if (players.length < 2) {
            alert(t('matches.needPlayers'));
            return;
        }
        if (window.confirm(t('brackets.resetConfirm'))) {
            const newBracket = generateDoubleEliminationBracket(players);
            // Save matches to DB
            await saveMatches(newBracket);

            // Update tournament status so we know bracket exists
            if (activeTournamentId) {
                await updateTournament(activeTournamentId, { status: 'in_progress' });
            }
        }
    };

    const handleMatchClick = (match) => {
        if (!isAuthenticated) return;
        // We need to check isBye on the player objects
        if (match.player1?.isBye || match.player2?.isBye) return;

        setSelectedMatch(match);
        setScoreA(match.score1 ?? '');
        setScoreB(match.score2 ?? '');
    };

    const submitScore = (e) => {
        e.preventDefault();
        if (!selectedMatch) return;

        // updateBracketMatch rebuilds state.
        const updated = updateBracketMatch(matches, selectedMatch.id, scoreA, scoreB, selectedMatch.microPoints || [], players);
        saveMatches(updated);
        setSelectedMatch(null);
    };

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
                            <BracketCanvas
                                matches={matches}
                                players={players}
                                onMatchClick={handleMatchClick}
                                readonly={!isAuthenticated}
                            />
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
