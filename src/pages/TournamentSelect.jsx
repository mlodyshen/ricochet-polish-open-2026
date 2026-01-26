import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTournament } from '../contexts/TournamentContext';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, Calendar, ArrowLeft } from 'lucide-react';

const TournamentSelect = () => {
    const { t } = useTranslation();
    const { tournaments, selectTournament } = useTournament();
    const navigate = useNavigate();

    const handleSelect = (id) => {
        selectTournament(id);
        navigate('/live');
    };

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString('pl-PL', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    return (
        <div className="flex-center" style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
            flexDirection: 'column',
            gap: '2rem',
            padding: '1rem'
        }}>
            <div className="text-center animate-fade-in-up" style={{ width: '100%', maxWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '60px', height: '60px',
                        background: 'rgba(6, 182, 212, 0.1)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--accent-cyan)'
                    }}>
                        <Trophy size={30} />
                    </div>
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{t('select.title')}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {t('select.subtitle')}
                    </p>

                    <button onClick={() => navigate('/')} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', margin: '0 auto' }}>
                        <ArrowLeft size={16} /> {t('common.back')}
                    </button>
                </div>

                <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem', animationDelay: '0.1s' }}>
                    {tournaments.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                            {t('select.noActive')}
                        </div>
                    )}

                    {tournaments.map(tourn => (
                        <button
                            key={tourn.id}
                            onClick={() => handleSelect(tourn.id)}
                            className="card hover-scale"
                            style={{
                                padding: '1.5rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                width: '100%',
                                textAlign: 'left',
                                cursor: 'pointer',
                                border: '1px solid transparent'
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>{tourn.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Calendar size={12} /> {formatDate(tourn.date)}
                                </div>
                            </div>
                            <ArrowRight size={20} color="var(--text-secondary)" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TournamentSelect;
