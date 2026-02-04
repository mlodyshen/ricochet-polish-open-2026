import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.tsx';
import {
    Activity,
    UserCog,
    Users,
    Swords,
    Trophy,
    GitBranch,
    Settings,
    LogOut
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import './Layout.css';

const NAV_ITEMS = [
    { path: '/live', key: 'live', icon: Activity },
    { path: '/matches', key: 'matches', icon: Swords },
    { path: '/standings', key: 'standings', icon: Trophy },
    { path: '/brackets', key: 'brackets', icon: GitBranch },
    { path: '/players', key: 'players', icon: Users },
    { path: '/organizer', key: 'organizer', icon: UserCog },
    { path: '/settings', key: 'settings', icon: Settings },
];

const Layout = () => {
    const { t } = useTranslation();
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // Keep track of current path

    // Force dark theme as per new design
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const currentYear = new Date().getFullYear();

    // Filter Navigation based on Auth
    const filteredNavItems = NAV_ITEMS.filter(item => {
        // Publicly visible pages (Content)
        if (['live', 'matches', 'standings', 'brackets', 'players'].includes(item.key)) return true;

        // Admin only pages
        if (['organizer', 'settings'].includes(item.key)) return isAuthenticated;

        return isAuthenticated;
    });

    // Check local path
    const isBracketsPage = location.pathname === '/brackets';

    const mainContentStyle = isLiveView
        ? { marginLeft: 0, padding: 0, maxWidth: 'none' }
        : isBracketsPage
            ? { maxWidth: '100%', padding: '0 1rem', marginTop: '140px' }
            : {};

    return (
        <div className="app-container">
            {/* Top Header */}
            <header className="top-header glass">
                <div className="header-branding">
                    <img src="/c.png" alt="Logo" style={{ height: '32px' }} />
                    <div className="brand-text">
                        <span>RICOCHET</span>
                        <span className="polish-flag-text">POLISH</span>
                        <span>OPEN 2026</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <LanguageSelector />

                    {isAuthenticated ? (
                        <button className="theme-toggle" onClick={handleLogout} title="Logout" style={{ marginLeft: '0.5rem' }}>
                            <LogOut size={20} />
                        </button>
                    ) : (
                        <NavLink to="/login" className="theme-toggle" title="Admin Login" style={{ marginLeft: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            <UserCog size={20} />
                        </NavLink>
                    )}
                </div>
            </header>

            {/* Desktop Sidebar - Hidden in Live View */}
            {!isLiveView && (
                <aside className="sidebar">
                    <nav className="nav-list">
                        {filteredNavItems.map((item, index) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `nav-item ${isActive ? 'active' : ''} ${isActive ? (index % 2 === 0 ? 'accent-pink' : 'accent-cyan') : ''}`
                                }
                            >
                                <item.icon size={20} />
                                <span>{t(`navigation.${item.key}`)}</span>
                            </NavLink>
                        ))}
                    </nav>
                </aside>
            )}

            {/* Main Content Area - Full Width in Live View, Expanded for Brackets */}
            <main className="main-content" style={mainContentStyle}>
                <div className="page-container">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation - Hidden in Live View */}
            {!isLiveView && (
                <nav className="bottom-nav">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                        >
                            <item.icon size={20} />
                            <span style={{ fontSize: '10px' }}>{t(`navigation.${item.key}`)}</span>
                        </NavLink>
                    ))}
                </nav>
            )}
        </div>
    );
};

export default Layout;
