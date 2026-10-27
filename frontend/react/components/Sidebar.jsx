import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../AuthContext.jsx';
import { CommunityIcon } from './Avatars.jsx';
import { readLocal, writeLocal } from '../../js/utils.js';
import { showToast } from '../Toasts.jsx';
import { api } from '../../js/api.js';

export default function Sidebar() {
    const {
        isLoggedIn,
        user,
        setUser,
        openAuthModal,
        openCommunityModal,
        sidebarCollapsed,
        toggleSidebar,
        mobileDrawerOpen,
        closeMobileDrawer,
        formDialog
    } = useAuth();

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const activeView = searchParams.get('view') || 'home';
    const activeFeed = searchParams.get('feed') || '';

    // Collapsed accordion sections
    const [collapsedSections, setCollapsedSections] = useState(() => {
        return readLocal('rc_sidebar_sections', {});
    });

    const toggleSection = (key) => {
        setCollapsedSections(prev => {
            const next = { ...prev, [key]: !prev[key] };
            writeLocal('rc_sidebar_sections', next);
            return next;
        });
    };

    // Close mobile drawer on resize > 767px
    useEffect(() => {
        const handler = () => {
            if (window.innerWidth > 767 && mobileDrawerOpen) {
                closeMobileDrawer();
            }
        };
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [mobileDrawerOpen, closeMobileDrawer]);

    // Handle create custom feed
    const handleCreateCustomFeed = async (e) => {
        e.preventDefault();
        const selected = new Set();
        const options = (user?.joinedCommunities || []).map(c => ({
            value: c.name,
            label: `r/${c.name}`,
            checked: selected.has(c.name.toLowerCase())
        }));

        const result = await formDialog({
            title: 'Create custom feed',
            subtitle: 'Combine communities you like into one feed.',
            submitLabel: 'Create',
            fields: [
                { name: 'name', label: 'Name', value: '', maxlength: 50, placeholder: 'e.g. Weekend reads' },
                { name: 'description', label: 'Description (optional)', type: 'textarea', rows: 2, value: '', maxlength: 300 },
                { name: 'communities', label: 'Communities', type: 'checkboxes', options, hint: options.length ? '' : 'Join some communities first, then add them here.' }
            ],
            onSubmit: async (values) => {
                if (!values.name?.trim()) throw new Error('Give your custom feed a name');
                const { user: updated, feedId } = await api.post('/users/me/feeds', values);
                setUser(updated);
                return feedId;
            }
        });

        if (result) {
            showToast('Custom feed created');
            navigate(`/index.html?view=custom&feed=${encodeURIComponent(result)}`);
        }
    };

    if (!isLoggedIn) {
        return (
            <aside className="sidebar-card">
                <div className="sidebar-content">
                    <h2 className="sidebar-title">Join the most real<br />place on the internet<br /><br /></h2>

                    <div className="auth-buttons-list">
                        <button
                            type="button"
                            className="auth-btn"
                            id="btnGoogle"
                            onClick={() => openAuthModal('login', { notice: "Google sign-in needs OAuth credentials, which this server doesn't have. Continue with email instead." })}
                        >
                            <span className="auth-btn-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                            </span>
                            <span className="auth-btn-text">Continue with Google</span>
                        </button>

                        <button
                            type="button"
                            className="auth-btn"
                            id="btnApple"
                            onClick={() => openAuthModal('login', { notice: "Apple sign-in needs OAuth credentials, which this server doesn't have. Continue with email instead." })}
                        >
                            <span className="auth-btn-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.13.64-2.82 1.44-.61.71-1.15 1.86-1.01 2.96 1.08.08 2.18-.56 2.84-1.36z" />
                                </svg>
                            </span>
                            <span className="auth-btn-text">Continue with Apple</span>
                        </button>

                        <button
                            type="button"
                            className="auth-btn"
                            id="btnPhone"
                            onClick={() => openAuthModal('login', { notice: "Phone number sign-in needs an SMS provider, which this server doesn't have. Continue with email instead." })}
                        >
                            <span className="auth-btn-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                    <line x1="12" y1="18" x2="12.01" y2="18" />
                                </svg>
                            </span>
                            <span className="auth-btn-text">Continue with Phone Number</span>
                        </button>

                        <button
                            type="button"
                            className="auth-btn"
                            id="btnEmail"
                            onClick={() => openAuthModal('Sign Up')}
                        >
                            <span className="auth-btn-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            </span>
                            <span className="auth-btn-text">Continue with Email</span>
                        </button>
                    </div>

                    <p className="sidebar-legal">
                        <br />
                        By continuing, you agree to our{' '}
                        <Link to="/page.html?p=user-agreement" className="legal-link">User Agreement</Link>{' '}
                        and acknowledge that you understand the{' '}
                        <Link to="/page.html?p=privacy" className="legal-link">Privacy Policy</Link>.
                    </p>
                </div>

                <div className="sidebar-illustration-wrapper">
                    <img src="assets/images/sidebar_illustration.png" alt="Reddit Snoo community illustration" className="sidebar-illustration-img" />
                </div>
            </aside>
        );
    }

    return (
        <>
            <div className="sidebar-authed-wrapper">
                <button
                    type="button"
                    className="btn-drawer-toggle border-toggle-btn"
                    id="drawerToggleBtn"
                    title="Collapse navigation"
                    onClick={toggleSidebar}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>

                <aside className="sidebar-authed-drawer" id="sidebarAuthedDrawer">
                    <nav className="nav-section">
                        <Link
                            to="/index.html?view=home"
                            className={`drawer-nav-item${activeView === 'home' && !activeFeed ? ' active' : ''}`}
                            data-nav="home"
                            onClick={closeMobileDrawer}
                        >
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                            </svg>
                            <span>Home</span>
                        </Link>

                        <Link
                            to="/index.html?view=popular"
                            className={`drawer-nav-item${activeView === 'popular' ? ' active' : ''}`}
                            data-nav="popular"
                            onClick={closeMobileDrawer}
                        >
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                <polyline points="17 6 23 6 23 12" />
                            </svg>
                            <span>Popular</span>
                        </Link>

                        <Link
                            to="/index.html?view=news"
                            className={`drawer-nav-item${activeView === 'news' ? ' active' : ''}`}
                            data-nav="news"
                            onClick={closeMobileDrawer}
                        >
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h8" />
                            </svg>
                            <span>News</span>
                        </Link>

                        <Link
                            to="/index.html?view=explore"
                            className={`drawer-nav-item${activeView === 'explore' ? ' active' : ''}`}
                            data-nav="explore"
                            onClick={closeMobileDrawer}
                        >
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                            </svg>
                            <span>Explore</span>
                        </Link>

                        <Link
                            to="/index.html?view=all"
                            className={`drawer-nav-item${activeView === 'all' ? ' active' : ''}`}
                            data-nav="all"
                            onClick={closeMobileDrawer}
                        >
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            <span>All</span>
                        </Link>

                        <a
                            href="#"
                            className="drawer-nav-item"
                            id="btnStartCommunity"
                            onClick={(e) => {
                                e.preventDefault();
                                closeMobileDrawer();
                                openCommunityModal();
                            }}
                        >
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>Start a community</span>
                        </a>
                    </nav>

                    <div className="drawer-divider"></div>

                    {/* Games on Reddit Section */}
                    <div className={`drawer-accordion${collapsedSections['GAMES ON REDDIT'] ? ' collapsed' : ''}`}>
                        <button
                            type="button"
                            className="accordion-header"
                            aria-expanded={!collapsedSections['GAMES ON REDDIT']}
                            onClick={() => toggleSection('GAMES ON REDDIT')}
                        >
                            <span>GAMES ON REDDIT</span>
                            <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        <Link to="/page.html?p=games&game=social-poker" className="game-poker-card" onClick={closeMobileDrawer}>
                            <div className="poker-badge">NEW</div>
                            <div className="poker-content">
                                <strong>Social Poker</strong>
                                <p>Call Their Bluff!</p>
                            </div>
                        </Link>

                        <Link to="/page.html?p=games&game=bonkyard" className="drawer-nav-item sub-item" onClick={closeMobileDrawer}>
                            <span className="game-avatar">🎲</span>
                            <span>Bonkyard</span>
                        </Link>
                        <Link to="/page.html?p=games&game=slingblade" className="drawer-nav-item sub-item" onClick={closeMobileDrawer}>
                            <span className="game-avatar">🎯</span>
                            <span>Slingblade</span>
                        </Link>
                        <Link to="/page.html?p=games&game=dictionary-fills" className="drawer-nav-item sub-item" onClick={closeMobileDrawer}>
                            <span className="game-avatar">📖</span>
                            <span>Dictionary Fills</span>
                        </Link>
                        <Link to="/page.html?p=games" className="drawer-nav-item sub-item" onClick={closeMobileDrawer}>
                            <span className="game-avatar">🎮</span>
                            <span>Discover More</span>
                        </Link>
                    </div>

                    <div className="drawer-divider"></div>

                    {/* Custom Feeds Section */}
                    <div className={`drawer-accordion${collapsedSections['CUSTOM FEEDS'] ? ' collapsed' : ''}`}>
                        <button
                            type="button"
                            className="accordion-header"
                            aria-expanded={!collapsedSections['CUSTOM FEEDS']}
                            onClick={() => toggleSection('CUSTOM FEEDS')}
                        >
                            <span>CUSTOM FEEDS</span>
                            <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        <a href="#" className="drawer-nav-item" id="btnCreateCustomFeed" onClick={handleCreateCustomFeed}>
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>Create Custom Feed</span>
                        </a>
                        <div id="sidebarCustomFeeds">
                            {(user?.customFeeds || []).map(f => (
                                <Link
                                    key={f.id}
                                    to={`/index.html?view=custom&feed=${encodeURIComponent(f.id)}`}
                                    className={`drawer-nav-item sub-item${activeView === 'custom' && activeFeed === f.id ? ' active' : ''}`}
                                    data-custom-feed={f.id}
                                    onClick={closeMobileDrawer}
                                >
                                    <span className="game-avatar">✨</span>
                                    <span>{f.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="drawer-divider"></div>

                    {/* Communities Section */}
                    <div className={`drawer-accordion${collapsedSections['COMMUNITIES'] ? ' collapsed' : ''}`}>
                        <button
                            type="button"
                            className="accordion-header"
                            aria-expanded={!collapsedSections['COMMUNITIES']}
                            onClick={() => toggleSection('COMMUNITIES')}
                        >
                            <span>COMMUNITIES</span>
                            <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        <Link to="/communities.html" className="drawer-nav-item" onClick={closeMobileDrawer}>
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                            </svg>
                            <span>Manage Communities</span>
                        </Link>
                        <div id="sidebarCommunityList">
                            {(user?.joinedCommunities || []).map(c => (
                                <Link
                                    key={c.id || c.name}
                                    to={`/community.html?name=${encodeURIComponent(c.name)}`}
                                    className="drawer-nav-item sub-item"
                                    onClick={closeMobileDrawer}
                                >
                                    <CommunityIcon community={c} size={20} />
                                    <span>r/{c.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="drawer-divider"></div>

                    {/* Resources Section */}
                    <div className={`drawer-accordion${collapsedSections['RESOURCES'] ? ' collapsed' : ''}`}>
                        <button
                            type="button"
                            className="accordion-header"
                            aria-expanded={!collapsedSections['RESOURCES']}
                            onClick={() => toggleSection('RESOURCES')}
                        >
                            <span>RESOURCES</span>
                            <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        <Link to="/page.html?p=about" className="drawer-nav-item" onClick={closeMobileDrawer}>
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <span>About Reddit</span>
                        </Link>
                        <Link to="/page.html?p=advertise" className="drawer-nav-item" onClick={closeMobileDrawer}>
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M19.07 4.93a10 10 0 010 14.14" />
                            </svg>
                            <span>Advertise</span>
                        </Link>
                        <Link to="/page.html?p=developer-platform" className="drawer-nav-item" onClick={closeMobileDrawer}>
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                            <span>Developer Platform</span>
                        </Link>
                        <Link to="/page.html?p=reddit-pro" className="drawer-nav-item" onClick={closeMobileDrawer}>
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            <span>Reddit Pro</span>
                            <span className="beta-tag">BETA</span>
                        </Link>
                        <Link to="/page.html?p=help" className="drawer-nav-item" onClick={closeMobileDrawer}>
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span>Help</span>
                        </Link>
                        <Link to="/page.html?p=blog" className="drawer-nav-item" onClick={closeMobileDrawer}>
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                            </svg>
                            <span>Blog</span>
                        </Link>
                        <Link to="/careers.html" className="drawer-nav-item" onClick={closeMobileDrawer}>
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                            </svg>
                            <span>Careers</span>
                        </Link>
                        <Link to="/press.html" className="drawer-nav-item" onClick={closeMobileDrawer}>
                            <svg className="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7" />
                            </svg>
                            <span>Press</span>
                        </Link>
                    </div>

                    <div className="drawer-divider"></div>

                    {/* Left Sidebar Footer Links */}
                    <div className="sidebar-footer-links">
                        <Link to="/index.html?view=popular&sort=top&t=all" className="footer-link-item" onClick={closeMobileDrawer}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span>Best of Reddit</span>
                        </Link>
                        <Link to="/page.html?p=best-of-reddit&lang=pt" className="footer-link-item" onClick={closeMobileDrawer}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                            </svg>
                            <span>Best of Reddit in Port...</span>
                        </Link>
                        <Link to="/page.html?p=best-of-reddit&lang=de" className="footer-link-item" onClick={closeMobileDrawer}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                            </svg>
                            <span>Best of Reddit in Ger...</span>
                        </Link>

                        <div className="footer-legal-compact">
                            <Link to="/page.html?p=rules" onClick={closeMobileDrawer}>Reddit Rules</Link>
                            <Link to="/page.html?p=privacy" onClick={closeMobileDrawer}>Privacy Policy</Link>
                            <Link to="/page.html?p=user-agreement" onClick={closeMobileDrawer}>User Agreement</Link>
                            <Link to="/page.html?p=accessibility" onClick={closeMobileDrawer}>Accessibility</Link>
                            <p className="copyright-text">Reddit, Inc. © 2026. All rights reserved.</p>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Fixed Toggle Button when Sidebar is Collapsed */}
            <button
                type="button"
                className={`btn-drawer-toggle fixed-collapsed-toggle${sidebarCollapsed ? '' : ' hidden'}`}
                id="fixedDrawerToggleBtn"
                title="Expand navigation"
                onClick={toggleSidebar}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
            </button>
        </>
    );
}
