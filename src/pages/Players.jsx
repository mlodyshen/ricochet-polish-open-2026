import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePlayers } from '../hooks/usePlayers';
import { Search, Plus, Edit2, Trash2, X, Upload, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EUROPEAN_COUNTRIES, getCountryCode } from '../constants/countries';
import './Players.css';
import { useAuth } from '../hooks/useAuth.tsx';

// Hardcoded lists removed in favor of CSV import

const PlayerFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        country: '',
        elo: ''
    });
    const [errors, setErrors] = useState({});

    // Autocomplete state
    const [showSuggestions, setShowSuggestions] = useState(false);
    const countryInputRef = useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            let fname = '';
            let lname = '';
            const full = initialData?.full_name || '';
            if (full) {
                // Simple split on first space, but better logic might be needed if multiple names.
                // Assuming "Surname Name" or "Name Surname"? 
                // Based on CSV request, columns are "Surname" and "Name".
                // Let's assume the stored full_name is "Surname Name" based on previous steps.

                // Wait, previous step CSV combined them as `${surname} ${name}` => "Bodis Michal".
                // So first word is surname? Or user wants specific fields now?
                // The user wants inputs to match CSV columns: Surname, Name.
                // So we should split by space, first token is Surname, rest is Name? 
                // Or let the user edit it.
                const parts = full.split(' ');
                if (parts.length > 0) lname = parts[0];
                if (parts.length > 1) fname = parts.slice(1).join(' ');
            }

            setFormData({
                first_name: fname,
                last_name: lname,
                country: initialData?.country || '',
                elo: initialData?.elo != null ? initialData.elo : ''
            });

            setErrors({});
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, initialData]);

    // Click outside to close helper
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (countryInputRef.current && !countryInputRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCountries = useMemo(() => {
        if (!formData.country) return EUROPEAN_COUNTRIES;
        const lower = formData.country.toLowerCase();
        return EUROPEAN_COUNTRIES.filter(c => c.toLowerCase().includes(lower));
    }, [formData.country]);

    const validate = () => {
        const newErrors = {};
        if (!formData.last_name.trim()) newErrors.last_name = "Nazwisko jest wymagane";
        if (!formData.first_name.trim()) newErrors.first_name = "Imię jest wymagane";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            // Recombine: Surname Name
            const combined = `${formData.last_name.trim()} ${formData.first_name.trim()}`;
            onSubmit({
                full_name: combined,
                country: formData.country,
                elo: formData.elo
            });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {initialData ? t('players.modal.editTitle') : t('players.modal.addTitle')}
                    </h2>
                    <button onClick={onClose} className="close-button">
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Nazwisko (Surname)</label>
                                <input
                                    className={`form-input ${errors.last_name ? 'error' : ''}`}
                                    value={formData.last_name}
                                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                    placeholder="np. Kowalski"
                                    autoFocus
                                />
                                {errors.last_name && <div className="error-message">{errors.last_name}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Imię (Name)</label>
                                <input
                                    className={`form-input ${errors.first_name ? 'error' : ''}`}
                                    value={formData.first_name}
                                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                    placeholder="np. Jan"
                                />
                                {errors.first_name && <div className="error-message">{errors.first_name}</div>}
                            </div>
                        </div>

                        <div className="form-group" ref={countryInputRef}>
                            <label className="form-label" htmlFor="country">{t('players.modal.labels.country')}</label>
                            <div className="autocomplete-wrapper">
                                <input
                                    id="country"
                                    className="form-input"
                                    value={formData.country}
                                    onChange={e => {
                                        setFormData({ ...formData, country: e.target.value });
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    placeholder={t('players.modal.placeholders.country')}
                                    autoComplete="off"
                                />
                                {showSuggestions && (
                                    <div className="autocomplete-dropdown">
                                        {filteredCountries.map(country => (
                                            <div
                                                key={country}
                                                className={`autocomplete-item ${formData.country === country ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setFormData({ ...formData, country });
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                {getCountryCode(country) ? (
                                                    <img
                                                        src={`https://flagcdn.com/20x15/${getCountryCode(country)}.png`}
                                                        srcSet={`https://flagcdn.com/40x30/${getCountryCode(country)}.png 2x`}
                                                        width="20"
                                                        height="15"
                                                        alt={country}
                                                        style={{ marginRight: '0.5rem', objectFit: 'contain' }}
                                                    />
                                                ) : null}
                                                {country}
                                            </div>
                                        ))}
                                        {filteredCountries.length === 0 && (
                                            <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                No matches
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="elo">{t('players.modal.labels.elo')}</label>
                            <input
                                id="elo"
                                type="number"
                                min="0"
                                className="form-input"
                                value={formData.elo}
                                onChange={e => setFormData({ ...formData, elo: e.target.value })}
                                placeholder={t('players.modal.placeholders.elo')}
                            />
                        </div>
                        <div className="modal-footer">
                            <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
                            <button type="submit" className="btn-primary">{t('common.save')}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const Players = () => {
    const { t } = useTranslation();
    const { players, addPlayer, updatePlayer, deletePlayer, importPlayers, bulkUpsertPlayers } = usePlayers();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const { isAuthenticated } = useAuth(); // Auth

    const filteredPlayers = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        let result = players.filter(p =>
            p.full_name?.toLowerCase().includes(lowerSearch)
        );

        // Sorting: High ELO first, Null ELO last (treat as 0), then Alphabetical
        return result.sort((a, b) => {
            const eloA = a.elo || 0;
            const eloB = b.elo || 0;
            if (eloA !== eloB) {
                return eloB - eloA; // Descending
            }
            return (a.full_name || "").localeCompare(b.full_name || "");
        });
    }, [players, searchTerm]);

    const handleAdd = () => {
        setEditingPlayer(null);
        setIsModalOpen(true);
    };

    const handleEdit = (player) => {
        setEditingPlayer(player);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm(t('common.confirmDelete'))) {
            deletePlayer(id);
        }
    };

    const handleSave = (data) => {
        if (editingPlayer) {
            updatePlayer(editingPlayer.id, data);
        } else {
            addPlayer(data);
        }
        showToast(t('common.saved'));
    };

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const fileInputRef = useRef(null);

    const handleCsvUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            // Basic CSV parser
            // Assuming header on first line
            // Headers: Surname,Name,Country,Total_Points
            // We need to robustly split lines and commas.

            // Improved CSV parser:
            const lines = text.split(/\r?\n/).filter(line => line.trim());
            if (lines.length < 2) {
                alert("Plik jest pusty lub brakuje nagłówka.");
                return;
            }

            const headerLine = lines[0];
            const separator = headerLine.includes(';') ? ';' : ',';

            // Map headers and clean them
            const headers = headerLine.split(separator).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

            // Find indices, but handle cases where columns might be shifted
            const surnameIndex = headers.indexOf('surname');
            const nameIndex = headers.findIndex(h => h === 'name' || h === 'firstname');
            const countryIndex = headers.indexOf('country');
            const eloIndex = headers.findIndex(h => h === 'total_points' || h === 'points' || h === 'elo');

            if (surnameIndex === -1 || nameIndex === -1) {
                alert(`Nie znaleziono wymaganych kolumn (Surname, Name). Wykryte nagłówki: ${headers.join(', ')}`);
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            const newPlayers = [];

            for (let i = 1; i < lines.length; i++) {
                const row = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));

                // Extra check: if the row is mostly empty, skip it
                if (row.filter(cell => cell).length === 0) continue;

                const surname = row[surnameIndex] || "";
                const name = row[nameIndex] || "";
                const fullName = `${surname} ${name}`.trim();

                if (!fullName) continue;

                const country = countryIndex !== -1 ? row[countryIndex] || "" : "";

                let elo = 0;
                if (eloIndex !== -1 && row[eloIndex]) {
                    // Handle numbers like "1 200" or "200.5" or "3,375"
                    const cleanElo = row[eloIndex].replace(/[^\d.,]/g, '').replace(',', '.');
                    elo = Math.round(parseFloat(cleanElo) || 0);
                }

                newPlayers.push({
                    full_name: fullName,
                    country: country,
                    elo: elo
                });
            }

            if (newPlayers.length === 0) {
                alert("Nie znaleziono żadnych zawodników w pliku (sprawdź czy dane nie są puste).");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            if (!confirm(`Znaleziono ${newPlayers.length} zawodników. Rozpocząć import?`)) {
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            try {
                const result = await bulkUpsertPlayers(newPlayers);
                if (result.success) {
                    showToast(`Pomyślnie zaimportowano ${result.count} zawodników.`);
                } else {
                    alert("Błąd importu: " + (result.error?.message || result.error));
                }
            } catch (err) {
                console.error("Import error:", err);
                alert("Wystąpił nieoczekiwany błąd podczas zapisu.");
            }

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsText(file);
    };

    // Close on ESC
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isModalOpen]);

    return (
        <div className="players-container animate-fade-in">
            <div className="players-header">
                <h1 className="players-title text-gradient">{t('players.title')}</h1>
                <div className="players-actions">
                    <div className="search-input-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder={t('players.searchPlaceholder')}
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {isAuthenticated && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".csv"
                                onChange={handleCsvUpload}
                            />
                            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} title="Importuj z pliku CSV">
                                <Upload size={18} />
                                <span className="hide-mobile">Importuj zawodników (Turniej)</span>
                            </button>
                            <button className="btn-primary" onClick={handleAdd}>
                                <Plus size={18} />
                                <span className="hide-mobile">{t('players.addPlayer')}</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="players-table-container">
                <table className="players-table">
                    <thead>
                        <tr>
                            <th>{t('players.headers.fullName')}</th>
                            <th>{t('players.headers.country')}</th>
                            <th>{t('players.headers.elo')}</th>
                            {isAuthenticated && <th style={{ width: '100px', textAlign: 'center' }}>{t('common.actions')}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPlayers.length > 0 ? (
                            filteredPlayers.map(player => (
                                <tr key={player.id}>
                                    <td>
                                        <span className="player-name">{player.full_name || player.fullName}</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {getCountryCode(player.country) ? (
                                                <img
                                                    src={`https://flagcdn.com/20x15/${getCountryCode(player.country)}.png`}
                                                    srcSet={`https://flagcdn.com/40x30/${getCountryCode(player.country)}.png 2x`}
                                                    width="20"
                                                    height="15"
                                                    alt={player.country}
                                                    style={{ objectFit: 'contain' }}
                                                />
                                            ) : (
                                                <span style={{ width: 20 }}></span>
                                            )}
                                            <span>{player.country || '-'}</span>
                                        </div>
                                    </td>
                                    <td>{player.elo || '-'}</td>
                                    {isAuthenticated && (
                                        <td>
                                            <div className="flex-center" style={{ gap: '0.5rem' }}>
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => handleEdit(player)}
                                                    title={t('common.edit')}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="btn-icon delete"
                                                    onClick={() => handleDelete(player.id)}
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={isAuthenticated ? "4" : "3"}>
                                    <div className="empty-state">
                                        {searchTerm ? t('players.empty.notFound') : t('players.empty.start')}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <PlayerFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSave}
                initialData={editingPlayer}
            />

            {toastMessage && (
                <div className="toast-container">
                    <div className="toast">
                        <Check size={20} color="var(--accent-primary)" />
                        {toastMessage}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Players;
