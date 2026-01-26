import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Users, Trophy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.tsx';
import './Live.css'; // Reuse Live css for animations or basic styles if needed, or inline.

const Welcome = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    // If already logged in (admin), maybe redirect to Organizer? 
    // Or just show the choice anyway as requested.
    // The user said "gdy wchodzisz na stronę to domyślnie pojawia się okno".
    // So let's show the window.

    return (
        <div className="flex-center" style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
            flexDirection: 'column',
            gap: '2rem',
            padding: '1rem'
        }}>
            <div className="text-center animate-fade-in-up">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '80px', height: '80px',
                        background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-purple))',
                        borderRadius: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 10px 25px -5px rgba(236, 72, 153, 0.5)'
                    }}>
                        <Trophy size={40} color="white" />
                    </div>
                </div>
                <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{t('common.appName')}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>{t('welcome.chooseMode')}</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                width: '100%',
                maxWidth: '700px',
                animationDelay: '0.1s'
            }} className="animate-fade-in-up">

                {/* Admin Option */}
                <button
                    onClick={() => navigate('/login')}
                    className="card hover-scale"
                    style={{
                        padding: '2.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                        border: '2px solid transparent',
                        cursor: 'pointer',
                        textAlign: 'center'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-pink)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                    <div style={{
                        padding: '1rem',
                        background: 'rgba(236, 72, 153, 0.1)',
                        borderRadius: '50%',
                        color: 'var(--accent-pink)'
                    }}>
                        <Shield size={48} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t('welcome.admin')}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {t('welcome.adminDesc')}
                        </p>
                    </div>
                </button>

                {/* Participant Option */}
                <button
                    onClick={() => {
                        logout();
                        navigate('/tournaments');
                    }}
                    className="card hover-scale"
                    style={{
                        padding: '2.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                        border: '2px solid transparent',
                        cursor: 'pointer',
                        textAlign: 'center'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                    <div style={{
                        padding: '1rem',
                        background: 'rgba(6, 182, 212, 0.1)',
                        borderRadius: '50%',
                        color: 'var(--accent-cyan)'
                    }}>
                        <Users size={48} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t('welcome.participant')}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {t('welcome.participantDesc')}
                        </p>
                    </div>
                </button>

            </div>
        </div>
    );
};

export default Welcome;
