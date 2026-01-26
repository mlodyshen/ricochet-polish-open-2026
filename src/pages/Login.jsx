import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.tsx';
import { Lock, User } from 'lucide-react';

const Login = () => {
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [debugInfo, setDebugInfo] = useState(null);

    // Redirect if already logged in (checked by parent usually, but good safeguard)
    if (isAuthenticated) {
        return <Navigate to="/organizer" replace />;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const success = login(username, password);

        setDebugInfo({
            enteredUsername: username,
            enteredPassLength: password.length,
            // Reveal hidden chars
            passCharCodes: Array.from(password).map(ch => ch.charCodeAt(0)).join(","),
            result: success
        });

        if (success) {
            navigate('/organizer', { replace: true });
            window.location.reload();
        } else {
            setError(t('login.error'));
        }
    };

    return (
        <div className="flex-center" style={{ minHeight: '80vh', flexDirection: 'column' }}>
            <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', borderTop: '4px solid var(--accent-pink)' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ marginBottom: '0.5rem' }}>{t('login.title')}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{t('login.subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {error && (
                        <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '0.9rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>{t('login.username')}</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ width: '100%', paddingLeft: '36px' }}
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder={t('login.usernamePlaceholder')}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>{t('login.password')}</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
                            <input
                                type="password"
                                className="form-input"
                                style={{ width: '100%', paddingLeft: '36px' }}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={t('login.passwordPlaceholder')}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem' }}>
                        {t('login.signIn')}
                    </button>

                    {debugInfo && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                            <p>Entered username: "{debugInfo.enteredUsername}"</p>
                            <p>Entered password length: {debugInfo.enteredPassLength}</p>
                            <p>Char codes: [{debugInfo.passCharCodes}]</p>
                            <p>login() result: {debugInfo.result.toString()}</p>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Login;
