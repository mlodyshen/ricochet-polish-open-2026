import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTournament } from '../contexts/TournamentContext';
import { Plus, Trash2, Check, ExternalLink, Calendar, Edit2, MapPin, X, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Organizer = () => {
    const { t } = useTranslation();
    const { tournaments, activeTournamentId, selectTournament, createTournament, deleteTournament, updateTournament } = useTournament();
    const [newByName, setNewByName] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const navigate = useNavigate();

    // Edit State
    const [editingTournament, setEditingTournament] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', date: '', address: '' });

    // Delete State
    const [deletingTournamentId, setDeletingTournamentId] = useState(null);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newByName.trim()) return;
        const id = await createTournament(newByName);
        if (id && newAddress.trim()) {
            await updateTournament(id, { address: newAddress });
        }
        setNewByName('');
        setNewAddress('');
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        // Use user locale if possible or 'pl-PL' / 'en-US' based on language
        // For now, let's stick to 'pl-PL' or dynamic. 
        // We can use i18n.language from useTranslation to format date?
        // Let's just keep 'pl-PL' for now as it's hardcoded in original or use 'default'.
        return new Date(isoString).toLocaleDateString('pl-PL', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const handleDelete = (id) => {
        // Confirmation now handled by modal, but if we kept window.confirm for fallback...
        // Logic relies on setDeletingTournamentId.
        // The modal text is handled in JSX.
        setDeletingTournamentId(id);
    };

    const confirmDelete = async () => {
        if (deletingTournamentId) {
            await deleteTournament(deletingTournamentId);
            setDeletingTournamentId(null);
        }
    };

    const openEdit = (tournament) => {
        setEditingTournament(tournament);
        // Format date for datetime-local input (YYYY-MM-DDThh:mm)
        const d = new Date(tournament.date);
        const dateStr = d.toISOString().slice(0, 16); // basic helper
        setEditForm({
            name: tournament.name,
            date: dateStr,
            address: tournament.address || ''
        });
    };

    const saveEdit = async (e) => {
        e.preventDefault();
        if (!editingTournament) return;
        await updateTournament(editingTournament.id, {
            name: editForm.name,
            date: new Date(editForm.date).toISOString(),
            address: editForm.address
        });
        setEditingTournament(null);
    };

    return (
        <div className="card fade-in" style={{ padding: '2rem' }}>
            <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>{t('organizer.title')}</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                {t('organizer.description')}
            </p>

            {/* Create New */}
            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '2rem' }}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={20} /> {t('organizer.createTitle')}
                </h3>
                <form onSubmit={handleCreate} style={{ display: 'grid', gap: '1rem', marginTop: '1rem', gridTemplateColumns: '1fr 1fr auto' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder={t('organizer.form.namePlaceholder')}
                        value={newByName}
                        onChange={e => setNewByName(e.target.value)}
                        required
                    />
                    <input
                        type="text"
                        className="form-input"
                        placeholder={t('organizer.form.addressPlaceholder')}
                        value={newAddress}
                        onChange={e => setNewAddress(e.target.value)}
                    />
                    <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>{t('organizer.form.createBtn')}</button>
                </form>
            </div>

            {/* List */}
            <div className="tournaments-list">
                <h3 style={{ marginBottom: '1rem' }}> {t('organizer.yourTournaments')} ({tournaments.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {tournaments.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
                            {t('organizer.noTournaments')}
                        </div>
                    )}

                    {tournaments.map(tourn => {
                        const isActive = tourn.id === activeTournamentId;
                        return (
                            <div key={tourn.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '1rem',
                                background: isActive ? 'rgba(6, 182, 212, 0.05)' : 'var(--bg-primary)',
                                border: `1px solid ${isActive ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                                borderRadius: '8px'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {tourn.name}
                                        {isActive && <span style={{ fontSize: '0.7rem', background: 'var(--accent-cyan)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>{t('organizer.active')}</span>}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.3rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Calendar size={12} /> {formatDate(tourn.date)}
                                        </div>
                                        {tourn.address && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <MapPin size={12} /> {tourn.address}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {!isActive && (
                                        <button
                                            className="btn-secondary"
                                            onClick={() => selectTournament(tourn.id)}
                                            title={t('organizer.switchTooltip')}
                                        >
                                            <Check size={16} style={{ marginRight: '0.4rem' }} /> {t('organizer.selected')}
                                        </button>
                                    )}
                                    <button
                                        className="btn-secondary"
                                        onClick={() => openEdit(tourn)}
                                        title={t('organizer.editTooltip')}
                                        style={{ padding: '0.5rem' }}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(tourn.id)}
                                        title={t('organizer.deleteTooltip')}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Edit Modal */}
            {editingTournament && (
                <div className="modal-overlay" onClick={() => setEditingTournament(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{t('organizer.editModalTitle')}</h2>
                            <button onClick={() => setEditingTournament(null)} className="close-button"><X size={20} /></button>
                        </div>
                        <form onSubmit={saveEdit}>
                            <div className="form-group">
                                <label className="form-label">{t('organizer.form.nameLabel')}</label>
                                <input
                                    className="form-input"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('organizer.form.dateLabel')}</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={editForm.date}
                                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('organizer.form.addressLabel')}</label>
                                <input
                                    className="form-input"
                                    value={editForm.address}
                                    onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                    placeholder={t('organizer.form.addressPlaceholder')}
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setEditingTournament(null)} className="btn-secondary">{t('organizer.form.cancelBtn')}</button>
                                <button type="submit" className="btn-primary">
                                    <Save size={16} style={{ marginRight: '0.5rem' }} /> {t('organizer.form.saveBtn')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingTournamentId && (
                <div className="modal-overlay" onClick={() => setDeletingTournamentId(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ marginBottom: '1rem', color: '#ef4444' }}>
                            <Trash2 size={48} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('organizer.deleteModalTitle')}</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            {t('organizer.deleteModalContent')} <br />
                            <strong>{t('organizer.deleteModalWarning')}</strong>
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button onClick={() => setDeletingTournamentId(null)} className="btn-secondary" style={{ flex: 1 }}>
                                {t('organizer.form.cancelBtn')}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="btn-primary"
                                style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}
                            >
                                {t('organizer.form.deleteBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Organizer;
