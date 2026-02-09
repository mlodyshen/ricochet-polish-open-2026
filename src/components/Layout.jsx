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
    Maximize,
    LogOut,
    Moon,
    Sun
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
    const location = useLocation();

    // Theme State
    const [darkMode, setDarkMode] = React.useState(() => {
        return localStorage.getItem('ricochet_theme') === 'dark';
    });

    // Apply Theme
    useEffect(() => {
        const theme = darkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('ricochet_theme', theme);
    }, [darkMode]);

    const toggleTheme = () => setDarkMode(!darkMode);

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

    // Check if we are in Live View Presentation Mode (TV Mode)
    const isLiveView = location.pathname === '/live' && new URLSearchParams(location.search).get('mode') === 'tv';

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
            <header className="top-header">
                <div className="header-branding">
                    <img src="/c.png" alt="Logo" style={{ height: '32px' }} />
                    <div className="brand-text">
                        <span>RICOCHET</span>
                        <span className="dutch-flag-text">DUTCH</span>
                        <span>OPEN 2026</span>
                    </div>
                </div>
                <div className="header-actions">
                    <LanguageSelector />

                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <button
                        className="theme-toggle"
                        onClick={() => {
                            const isTv = new URLSearchParams(location.search).get('mode') === 'tv';
                            if (isTv) {
                                navigate(location.pathname);
                            } else {
                                navigate('/live?mode=tv');
                            }
                        }}
                        title="TV Mode"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem', height: '36px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                        <Maximize size={16} />
                        <span>TV Mode</span>
                    </button>

                    {isAuthenticated ? (
                        <button className="theme-toggle" onClick={handleLogout} title="Logout">
                            <LogOut size={20} />
                        </button>
                    ) : (
                        <NavLink to="/login" className="theme-toggle" title="Admin Login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            <UserCog size={20} />
                        </NavLink>
                    )}
                </div>
            </header >

            {/* Desktop Sidebar - Hidden in Live View */}
            {
                !isLiveView && (
                    <aside className="sidebar">
                        <nav className="nav-list">
                            {filteredNavItems.map((item, index) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `nav-item ${isActive ? 'active accent-pink' : ''}`
                                    }
                                >
                                    <item.icon size={20} />
                                    <span>{t(`navigation.${item.key}`)}</span>
                                </NavLink>
                            ))}
                        </nav>
                    </aside>
                )
            }

            {/* Main Content Area - Full Width in Live View, Expanded for Brackets */}
            <main className="main-content" style={mainContentStyle}>
                <div className="page-container">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation - Hidden in Live View */}
            {
                !isLiveView && (
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
                )
            }
        </div >
    );
};

export default Layout;
