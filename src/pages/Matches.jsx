import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTournamentMatches } from '../hooks/useTournamentMatches';
import { useTournament } from '../contexts/TournamentContext';
import { updateBracketMatch, clearBracketMatch, generateDoubleEliminationBracket } from '../utils/bracketLogic';
import { getBestOf, getMatchStatus, compareMatchIds } from '../utils/matchUtils';
import { Edit2, Trophy, Clock, Activity, CheckCircle, Save, X, Trash2, GripVertical } from 'lucide-react';
import './Matches.css';
import { usePlayers } from '../hooks/usePlayers';
import { useAuth } from '../hooks/useAuth.tsx';
import { getCountryCode } from '../constants/countries';

// --- DND KIT IMPORTS ---
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const formatName = (p) => {
    if (!p) return 'TBD';
    if (p.full_name) return p.full_name;
    if (p.fullName) return p.fullName;
    if (p.firstName && p.lastName) return `${p.firstName} ${p.lastName}`;
    return 'Unknown Player';
};

const PlayerFlag = ({ countryCode }) => {
    if (!countryCode) return null;
    let code = countryCode;
    if (code.length > 2) {
        code = getCountryCode(code) || code;
    }
    if (!code || code.length !== 2) return null;

    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            alt={countryCode}
            className="player-flag"
            onError={(e) => { e.target.style.display = 'none'; }}
        />
    );
};

// --- SORTABLE ITEM COMPONENT ---
const SortableMatchRow = ({ match, index, queueType, isAuthenticated, onEdit }) => {
    const { t } = useTranslation();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: match.id, data: { match, queueType } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        touchAction: 'none', // Prevent scrolling while dragging on touch
        position: 'relative',
        zIndex: isDragging ? 999 : 1,
    };

    const isWB = match.bracket === 'wb';
    const isGF = match.bracket === 'gf';
    const bracketClass = isGF ? 'gf' : (isWB ? 'wb' : 'lb');
    const bracketLabel = isGF ? t('matches.bracketFinal') : (isWB ? t('matches.bracketWinners') : t('matches.bracketLosers'));

    // Determine court color fallback
    let colorType = queueType;
    if (!colorType) {
        const cUpper = (match.court || '').toUpperCase();
        if (cUpper.includes('LEWY') || cUpper.includes('LEFT') || cUpper.includes('RÓŻOWY') || cUpper.includes('PINK')) colorType = 'pink';
        else if (cUpper.includes('PRAWY') || cUpper.includes('RIGHT') || cUpper.includes('TURKUSOWY') || cUpper.includes('CYAN')) colorType = 'cyan';
        else colorType = index % 2 === 0 ? 'pink' : 'cyan';
    }

    const rowClass = `match-list-row ${isAuthenticated ? 'has-controls' : ''} ${colorType} ${isDragging ? 'dragging' : ''}`;
    const matchIdShort = match.id.split('-m')[1] || match.id;

    let courtLabel = match.court;
    if (match.court === 'Kort Lewy') courtLabel = t('live.courtPink');
    if (match.court === 'Kort Prawy') courtLabel = t('live.courtCyan');

    return (
        <div ref={setNodeRef} style={style} className={rowClass}>
            <div className="row-meta-badge">
                <span className={`bracket-pill ${bracketClass}`}>{bracketLabel}</span>
                <span style={{ opacity: 0.5, margin: '0 4px' }}>•</span>
                <span>R{match.round}</span>
                <span style={{ opacity: 0.5, margin: '0 4px' }}>•</span>
                <span>#{matchIdShort}</span>
                {match.court && <span className="court-label"> • {courtLabel}</span>}
            </div>

            {isAuthenticated && (
                <div className="row-controls" {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GripVertical size={20} style={{ opacity: 0.6 }} />
                </div>
            )}

            <div className="player p1">
                <span className="name">{formatName(match.player1)}</span>
                <PlayerFlag countryCode={match.player1.country} />
            </div>

            <div className="match-center-info">
                {match.winnerId ? (
                    <span className="final-score">{match.score1} : {match.score2}</span>
                ) : (
                    <div className="score-divider">
                        <span className="vs">{t('common.vs')}</span>
                    </div>
                )}
            </div>

            <div className="player p2">
                <PlayerFlag countryCode={match.player2.country} />
                <span className="name">{formatName(match.player2)}</span>
            </div>

            <div className="row-action">
                {isAuthenticated && (
                    <button className="action-btn" onClick={() => onEdit(match)} title="Edit">
                        <Edit2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

// --- DRAG OVERLAY ITEM (Visual Clone) ---
const DragOverlayItem = ({ match }) => {
    // Simplified version for the drag preview
    const { t } = useTranslation();
    if (!match) return null;
    return (
        <div className={`match-list-row dragging-clone`} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', opacity: 0.9 }}>
            <div className="player p1">
                <span className="name">{formatName(match.player1)}</span>
            </div>
            <div className="match-center-info">VS</div>
            <div className="player p2">
                <span className="name">{formatName(match.player2)}</span>
            </div>
        </div>
    );
};

const MatchEditModal = ({ match, onClose, onSave, onClear }) => {
    const { t } = useTranslation();
    const bestOf = getBestOf(match.bracket);
    const winThreshold = Math.ceil(bestOf / 2);

    const [score1, setScore1] = useState(match.score1 || 0);
    const [score2, setScore2] = useState(match.score2 || 0);
    const [status, setStatus] = useState(match.winnerId ? 'finished' : 'live');
    const [court, setCourt] = useState(match.court || '');

    // Removed microPoints state logic as requested by user

    // Ref for mount check
    const isMounted = useRef(false);

    const getSavePayload = () => {
        const s1 = parseInt(score1) || 0;
        const s2 = parseInt(score2) || 0;

        let finalStatus = status;
        let winnerId = match.winnerId;

        if (s1 >= winThreshold) {
            finalStatus = 'finished';
            winnerId = match.player1.id;
        } else if (s2 >= winThreshold) {
            finalStatus = 'finished';
            winnerId = match.player2.id;
        } else {
            if (status === 'finished') {
                if (s1 > s2) winnerId = match.player1.id;
                else if (s2 > s1) winnerId = match.player2.id;
                else {
                    finalStatus = 'live';
                    winnerId = null;
                }
            } else {
                finalStatus = 'live';
                winnerId = null;
            }
        }

        return {
            score1: s1,
            score2: s2,
            microPoints: [], // Explicitly empty array
            forceFinished: finalStatus === 'finished',
            court: court,
            winnerId: winnerId
        };
    };

    const onSaveRef = useRef(onSave);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }
        const timer = setTimeout(() => {
            onSaveRef.current(match.id, getSavePayload(), { autoSave: true });
        }, 500);
        return () => clearTimeout(timer);
    }, [score1, score2, status, court]);

    const handleSave = (e) => {
        e.preventDefault();
        onSave(match.id, getSavePayload(), { autoSave: false });
    };

    const handleClear = () => {
        if (window.confirm("Are you sure? This will remove the result.")) {
            onClear(match.id);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px', maxWidth: '95%' }}>
                <div className="modal-header">
                    <h2 className="modal-title">{t('matches.editResultTitle')}</h2>
                    <button onClick={onClose} className="close-button"><X size={20} /></button>
                </div>

                <div style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {t('matches.formatInfo', { n: winThreshold, bo: bestOf })}
                </div>

                <form onSubmit={handleSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 10px 1fr', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                                {match.player1?.full_name || 'TBD'}
                            </div>
                        </div>
                        <div></div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                                {match.player2?.full_name || 'TBD'}
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <input
                                type="number" className="form-input" style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700 }}
                                min="0" max={winThreshold}
                                value={score1} onChange={e => setScore1(e.target.value)}
                            />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-secondary)', textAlign: 'center' }}>:</div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <input
                                type="number" className="form-input" style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700 }}
                                min="0" max={winThreshold}
                                value={score2} onChange={e => setScore2(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('matches.statusLabel')}</label>
                        <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="live">{t('matches.statusLive')}</option>
                            <option value="finished">{t('matches.statusFinished')}</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('matches.courtLabel')}</label>
                        <select className="form-input" value={court} onChange={e => setCourt(e.target.value)}>
                            <option value="">{t('matches.noCourt')}</option>
                            <option value="Kort Lewy">{t('live.courtPink')}</option>
                            <option value="Kort Prawy">{t('live.courtCyan')}</option>
                        </select>
                    </div>

                    <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                        {match.winnerId ? (
                            <button type="button" onClick={handleClear} className="btn-secondary" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                                <Trash2 size={16} /> {t('common.reset')}
                            </button>
                        ) : <div></div>}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
                            <button type="submit" className="btn-primary">
                                <Save size={16} /> {t('common.save')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Matches = () => {
    const { t } = useTranslation();
    const { matches, saveMatches } = useTournamentMatches();
    const { players } = usePlayers();
    const { activeTournamentId, updateTournament } = useTournament();
    const [filter, setFilter] = useState('all');
    const [editingMatch, setEditingMatch] = useState(null);
    const { isAuthenticated } = useAuth();
    const [activeDragId, setActiveDragId] = useState(null);

    const lastScrollPos = useRef(0);

    const handleEditOpen = (match) => {
        lastScrollPos.current = window.scrollY;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setEditingMatch(match);
    };

    const handleEditClose = () => {
        setEditingMatch(null);
        setTimeout(() => {
            window.scrollTo({ top: lastScrollPos.current, behavior: 'instant' });
        }, 50);
    };

    // Auto-balance queues effect (unchanged logic)
    useEffect(() => {
        if (!matches || matches.length === 0) return;
        const pendingUnassigned = matches.filter(m => m.status === 'pending' && !m.court);
        if (pendingUnassigned.length > 0) {
            let leftCount = matches.filter(m => m.status === 'pending' && m.court && (m.court === 'Kort Lewy' || m.court.toUpperCase().includes('LEWY'))).length;
            let rightCount = matches.filter(m => m.status === 'pending' && m.court && (m.court === 'Kort Prawy' || m.court.toUpperCase().includes('PRAWY'))).length;
            const updatedMatches = matches.map(m => {
                if (m.status === 'pending' && !m.court) {
                    if (leftCount <= rightCount) { leftCount++; return { ...m, court: 'Kort Lewy' }; }
                    else { rightCount++; return { ...m, court: 'Kort Prawy' }; }
                }
                return m;
            });
            saveMatches(updatedMatches);
        }
    }, [matches]);

    const processedMatches = useMemo(() => {
        if (!matches || matches.length === 0) return { active: [], pending: [], finished: [], pinkQueue: [], cyanQueue: [] };

        const enriched = matches.map(m => {
            const p1 = players.find(p => p.id === m.player1Id);
            const p2 = players.find(p => p.id === m.player2Id);
            return {
                ...m,
                player1: p1 || { full_name: 'TBD', id: null, isBye: false },
                player2: p2 || { full_name: 'TBD', id: null, isBye: false },
                status: getMatchStatus({ ...m, winner_id: m.winnerId, player1: p1 || { id: null }, player2: p2 || { id: null } }),
                canEdit: (p1 && p2 && !p1.isBye && !p2.isBye)
            };
        }).filter(m => m.player1Id && m.player2Id && !m.player1.isBye && !m.player2.isBye);

        const active = enriched.filter(m => m.status === 'live');
        const pending = enriched.filter(m => m.status === 'pending').sort((a, b) => {
            const oa = (a.manualOrder !== undefined && a.manualOrder !== null) ? a.manualOrder : Number.MAX_SAFE_INTEGER;
            const ob = (b.manualOrder !== undefined && b.manualOrder !== null) ? b.manualOrder : Number.MAX_SAFE_INTEGER;
            if (oa !== ob) return oa - ob;
            return compareMatchIds(a.id, b.id);
        });
        const finished = enriched.filter(m => m.status === 'finished').sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

        const pinkQueue = [];
        const cyanQueue = [];
        pending.forEach((m) => {
            const cUpper = (m.court || '').toUpperCase();
            const isLeft = cUpper.includes('LEWY') || cUpper.includes('LEFT') || cUpper.includes('RÓŻOWY') || cUpper.includes('PINK');
            const isRight = cUpper.includes('PRAWY') || cUpper.includes('RIGHT') || cUpper.includes('TURKUSOWY') || cUpper.includes('CYAN');
            if (isLeft) pinkQueue.push(m);
            else if (isRight) cyanQueue.push(m);
            else if (pinkQueue.length <= cyanQueue.length) pinkQueue.push(m);
            else cyanQueue.push(m);
        });

        return { active, pending, finished, pinkQueue, cyanQueue };
    }, [matches, players]);


    // -- DND LOGIC --
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event) => {
        setActiveDragId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over) return;
        if (active.id === over.id) return;

        // Find which lists (queues) the items belong to
        const isPinkSource = processedMatches.pinkQueue.find(m => m.id === active.id);
        const isCyanSource = processedMatches.cyanQueue.find(m => m.id === active.id);

        // Target Queue Detection
        const isPinkTarget = processedMatches.pinkQueue.find(m => m.id === over.id) || (over.id === 'PinkQueueContainer');
        const isCyanTarget = processedMatches.cyanQueue.find(m => m.id === over.id) || (over.id === 'CyanQueueContainer');

        let sourceQueue = isPinkSource ? processedMatches.pinkQueue : (isCyanSource ? processedMatches.cyanQueue : null);
        let targetQueue = null;
        let targetCourtName = '';

        if (isPinkTarget || (over.id === 'PinkQueueContainer')) {
            targetQueue = processedMatches.pinkQueue;
            targetCourtName = 'Kort Lewy';
        } else if (isCyanTarget || (over.id === 'CyanQueueContainer')) {
            targetQueue = processedMatches.cyanQueue;
            targetCourtName = 'Kort Prawy';
        }

        if (!sourceQueue || !targetQueue) return;

        const sourceIds = sourceQueue.map(m => m.id);
        const targetIds = targetQueue.map(m => m.id);
        let newSourceIds = [...sourceIds];
        let newTargetIds = [...targetIds];

        if (sourceQueue === targetQueue) {
            // Same list reordering
            const oldIndex = sourceIds.indexOf(active.id);
            const newIndex = targetIds.indexOf(over.id);
            newSourceIds = arrayMove(newSourceIds, oldIndex, newIndex);
            updateMatchesOrder(newSourceIds, targetCourtName);
        } else {
            // Moving between lists
            const oldIndex = sourceIds.indexOf(active.id);
            let newIndex = targetIds.indexOf(over.id);
            if (newIndex === -1) newIndex = targetIds.length;

            newSourceIds.splice(oldIndex, 1);
            newTargetIds.splice(newIndex, 0, active.id);

            const updates = [];
            newSourceIds.forEach((mid, idx) => {
                updates.push({ id: mid, manualOrder: idx * 100, court: isPinkSource ? 'Kort Lewy' : 'Kort Prawy' });
            });
            newTargetIds.forEach((mid, idx) => {
                updates.push({ id: mid, manualOrder: idx * 100, court: targetCourtName });
            });

            applyBatchUpdates(updates);
        }
    };

    const updateMatchesOrder = (sortedIds, courtName) => {
        const updates = sortedIds.map((id, index) => ({
            id,
            manualOrder: index * 100,
            court: courtName
        }));
        applyBatchUpdates(updates);
    };

    const applyBatchUpdates = (updatesArr) => {
        const updateMap = new Map();
        updatesArr.forEach(u => updateMap.set(u.id, u));

        const newMatches = matches.map(m => {
            if (updateMap.has(m.id)) {
                const u = updateMap.get(m.id);
                return { ...m, manualOrder: u.manualOrder, court: u.court };
            }
            return m;
        });
        saveMatches(newMatches);
    };


    const renderActiveMatch = (match, index) => {
        const cUpper = (match.court || '').toUpperCase();
        const isLeft = cUpper.includes('LEWY') || cUpper.includes('LEFT') || cUpper.includes('RÓŻOWY') || cUpper.includes('PINK') || (!match.court && index % 2 === 0);
        const accentColor = isLeft ? 'var(--accent-pink)' : '#21468B';
        let courtDisplay = match.court || (isLeft ? t('live.courtPink') : t('live.courtCyan'));
        if (match.court === 'Kort Lewy') courtDisplay = t('live.courtPink');
        if (match.court === 'Kort Prawy') courtDisplay = t('live.courtCyan');

        return (
            <div key={match.id} className="active-match-card" style={{ '--accent-color': accentColor }}>
                <div className="active-match-header">
                    <span style={{ color: accentColor }}>{courtDisplay}</span>
                </div>
                <div className="active-score-board">
                    <div className="active-player left">
                        <PlayerFlag countryCode={match.player1.country} />
                        <span className="active-player-name">{match.player1.full_name}</span>
                    </div>
                    <div className="active-score-center">
                        <div className="active-set-score">{match.score1 ?? 0}</div>
                        <div className="vs-divider">:</div>
                        <div className="active-set-score">{match.score2 ?? 0}</div>
                    </div>
                    <div className="active-player right">
                        <span className="active-player-name">{match.player2.full_name}</span>
                        <PlayerFlag countryCode={match.player2.country} />
                    </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.6 }}>
                    {(match.bracket || '').toUpperCase()} {t('brackets.round')} {match.round} • {t('matches.match', { id: match.id.split('-m')[1] })}
                </div>
                {isAuthenticated && (
                    <div className="active-actions">
                        <button className="edit-btn" onClick={() => handleEditOpen(match)} style={{ borderColor: accentColor, color: accentColor }}>
                            <Edit2 size={16} style={{ marginRight: '6px' }} /> {t('matches.controlMatch')}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderMatchRowStatic = (match) => {
        return (
            <div key={match.id} className="match-list-row">
                <div className="row-meta-badge">
                    <span className="bracket-pill">{match.bracket}</span>
                    <span>#{match.id.split('-m')[1]}</span>
                    {match.court && <span className="court-label">• {match.court}</span>}
                </div>
                <div className="player p1">
                    <span className="name">{formatName(match.player1)}</span>
                    <PlayerFlag countryCode={match.player1.country} />
                </div>
                <div className="match-center-info">
                    <span className="final-score">{match.score1} : {match.score2}</span>
                </div>
                <div className="player p2">
                    <PlayerFlag countryCode={match.player2.country} />
                    <span className="name">{formatName(match.player2)}</span>
                </div>
            </div>
        );
    };

    const handleSaveScore = (matchId, data, options = {}) => {
        const status = data.forceFinished ? 'finished' : 'live';
        const newState = updateBracketMatch(matches, matchId, data.score1, data.score2, data.microPoints, players, data.winnerId, status);
        const finalState = newState.map(m => {
            if (m.id === matchId) return { ...m, court: data.court };
            const old = matches.find(oldM => oldM.id === m.id);
            return { ...m, court: old?.court || m.court };
        });
        saveMatches(finalState, matchId);
        if (!options.autoSave) {
            handleEditClose();
        }
    };

    const handleClearScore = (matchId) => {
        const resetMatches = clearBracketMatch(matches, matchId, players);
        saveMatches(resetMatches);
        handleEditClose();
    };

    if (!matches || matches.length === 0) {
        return (
            <div className="matches-container animate-fade-in">
                <div className="empty-matches">
                    <h2>{t('matches.noActiveMatches')}</h2>
                    {isAuthenticated && (
                        <button
                            onClick={async () => {
                                if (window.confirm(t('matches.generateConfirm', { count: players.length }))) {
                                    const newBracket = generateDoubleEliminationBracket(players);
                                    await saveMatches(newBracket);
                                    if (activeTournamentId) {
                                        await updateTournament(activeTournamentId, { status: 'in_progress' });
                                    }
                                }
                            }}
                            className="btn-primary"
                        >
                            <Trophy size={18} style={{ marginRight: '0.5rem' }} />
                            {t('matches.generateBtn')}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="matches-container animate-fade-in">
            <div className="matches-header">
                <h1 className="matches-title text-gradient">{t('matches.title')}</h1>
                <div className="matches-filters">
                    <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>{t('matches.filters.all')}</button>
                    <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>{t('matches.filters.pending')}</button>
                    <button className={`filter-btn ${filter === 'finished' ? 'active' : ''}`} onClick={() => setFilter('finished')}>{t('matches.filters.finished')}</button>
                </div>
            </div>

            {(processedMatches.active.length > 0) && (filter === 'all' || filter === 'pending') && (
                <section>
                    <div className="section-header">
                        <Activity size={20} color="var(--accent-pink)" /> {t('matches.liveArena')}
                    </div>
                    <div className="active-matches-grid">
                        {processedMatches.active.map((m, i) => renderActiveMatch(m, i))}
                    </div>
                </section>
            )}

            {(processedMatches.pending.length > 0) && (filter === 'all' || filter === 'pending') && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <section>
                        <div className="section-header">
                            <Clock size={20} /> {t('matches.nextMatches')}
                        </div>

                        <div className="queue-columns">
                            {/* LEFT COLUMN */}
                            <div className="queue-column">
                                <h3 style={{ color: 'var(--accent-pink)', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', paddingLeft: '0.5rem', borderLeft: '3px solid var(--accent-pink)' }}>
                                    {t('live.courtPink')}
                                </h3>
                                <SortableContext
                                    id="PinkQueueContainer"
                                    items={processedMatches.pinkQueue.map(m => m.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {processedMatches.pinkQueue.length === 0 && <div className="empty-state-text" style={{ padding: '1rem', fontSize: '0.8rem' }}>{t('matches.queueEmpty')}</div>}
                                    {processedMatches.pinkQueue.map((m, idx) => (
                                        <SortableMatchRow key={m.id} match={m} index={idx} queueType="pink" isAuthenticated={isAuthenticated} onEdit={handleEditOpen} />
                                    ))}
                                </SortableContext>
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="queue-column">
                                <h3 style={{ color: '#21468B', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', paddingLeft: '0.5rem', borderLeft: '3px solid #21468B' }}>
                                    {t('live.courtCyan')}
                                </h3>
                                <SortableContext
                                    id="CyanQueueContainer"
                                    items={processedMatches.cyanQueue.map(m => m.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {processedMatches.cyanQueue.length === 0 && <div className="empty-state-text" style={{ padding: '1rem', fontSize: '0.8rem' }}>{t('matches.queueEmpty')}</div>}
                                    {processedMatches.cyanQueue.map((m, idx) => (
                                        <SortableMatchRow key={m.id} match={m} index={idx} queueType="cyan" isAuthenticated={isAuthenticated} onEdit={handleEditOpen} />
                                    ))}
                                </SortableContext>
                            </div>
                        </div>

                        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                            {activeDragId ? (
                                <DragOverlayItem match={matches.find(m => m.id === activeDragId)} />
                            ) : null}
                        </DragOverlay>
                    </section>
                </DndContext>
            )}

            {(processedMatches.finished.length > 0) && (filter === 'all' || filter === 'finished') && (
                <section>
                    <div className="section-header">
                        <CheckCircle size={20} color="#10b981" /> {t('matches.played')}
                    </div>
                    <div className="match-list-container">
                        {processedMatches.finished.map(m => renderMatchRowStatic(m))}
                    </div>
                </section>
            )}

            {(processedMatches.active.length === 0 && processedMatches.pending.length === 0 && processedMatches.finished.length === 0) && (
                <div className="empty-state-text">{t('matches.allFinished')}</div>
            )}

            {editingMatch && (
                <MatchEditModal
                    match={editingMatch}
                    onClose={handleEditClose}
                    onSave={handleSaveScore}
                    onClear={handleClearScore}
                />
            )}
        </div>
    );
};

export default Matches;
