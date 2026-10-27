import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../AuthContext.jsx';
import { UserAvatar } from './Avatars.jsx';
import Search from './Search.jsx';
import { api } from '../../js/api.js';
import { timeAgo } from '../../js/utils.js';
import { showToast } from '../Toasts.jsx';

const NOTIF_ICONS = { comment: '💬', reply: '↩️', message: '✉️', community: '🛡️' };

export default function Header() {
    const {
        isLoggedIn,
        user,
        logout,
        setUser,
        openAuthModal,
        toggleChatModal,
        openChatWith,
        darkMode,
        toggleDarkMode,
        toggleSidebar,
        toggleMobileDrawer
    } = useAuth();

    const navigate = useNavigate();

    // Dropdown states
    const [moreOpen, setMoreOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);

    // Badges & notifications
    const [notifUnread, setNotifUnread] = useState(0);
    const [chatUnread, setChatUnread] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);

    const headerRef = useRef(null);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (headerRef.current && !headerRef.current.contains(e.target)) {
                setMoreOpen(false);
                setProfileOpen(false);
                setNotifOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Refresh notification & chat badges
    const refreshBadges = async () => {
        if (!isLoggedIn) return;
        try {
            const [{ unread }, { count }] = await Promise.all([
                api.get('/notifications'),
                api.get('/chats/unread')
            ]);
            setNotifUnread(unread || 0);
            setChatUnread(count || 0);
        } catch {}
    };

    useEffect(() => {
        if (isLoggedIn) {
            refreshBadges();
            const timer = setInterval(refreshBadges, 30000);
            return () => clearInterval(timer);
        }
    }, [isLoggedIn]);

    // Load notifications when dropdown opens
    const loadNotifications = async () => {
        setNotifLoading(true);
        try {
            const { notifications: list, unread } = await api.get('/notifications');
            setNotifications(list || []);
            setNotifUnread(unread || 0);
        } catch {
            setNotifications([]);
        } finally {
            setNotifLoading(false);
        }
    };

    const handleBellClick = (e) => {
        e.stopPropagation();
        setProfileOpen(false);
        setMoreOpen(false);
        const next = !notifOpen;
        setNotifOpen(next);
        if (next) loadNotifications();
    };

    const handleMarkAllRead = async (e) => {
        e.stopPropagation();
        try {
            await api.post('/notifications/read-all');
            setNotifUnread(0);
            loadNotifications();
        } catch {}
    };

    const handleNotifItemClick = async (notif) => {
        try {
            await api.post(`/notifications/${notif.id}/read`).catch(() => {});
        } catch {}
        setNotifOpen(false);
        setNotifUnread(prev => Math.max(0, prev - 1));
        if (notif.link?.startsWith('chat:')) {
            openChatWith(notif.link.slice(5));
        } else if (notif.link) {
            navigate(notif.link);
        }
    };

    const handleModModeChange = async (e) => {
        const checked = e.target.checked;
        try {
            const updated = await api.patch('/users/me', { prefs: { modMode: checked } });
            setUser(updated.user);
            showToast(`Mod Mode ${checked ? 'on' : 'off'}`);
        } catch (err) {
            showToast(err.message);
        }
    };

    return (
        <header className="header" ref={headerRef}>
            <div className="header-left">
                {isLoggedIn && (
                    <button
                        className="btn-drawer-toggle header-hamburger-btn"
                        id="headerDrawerToggleBtn"
                        title="Toggle navigation"
                        aria-label="Toggle navigation"
                        onClick={() => {
                            if (window.matchMedia('(max-width: 767px)').matches) {
                                toggleMobileDrawer();
                            } else {
                                toggleSidebar();
                            }
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                )}

                <Link to="/" className="header-logo-link" aria-label="Reddit Home">
                    <div className="reddit-logo">
                        <svg className="snoo-icon" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                            <circle cx="10" cy="10" r="10" fill="#FF4500" />
                            <path fill="#FFF" d="M16.67 10a1.46 1.46 0 00-2.47-1.05 7.12 7.12 0 00-3.85-1.23l.8-2.54 2.18.52a1 1 0 101.07-1.42 1 1 0 00-.97.74l-2.44-.58a.28.28 0 00-.34.19l-.92 2.92a7.17 7.17 0 00-3.87 1.23 1.46 1.46 0 00-1.46 2.47 3.32 3.32 0 000 3.73 1.46 1.46 0 001.46 2.47 7.42 7.42 0 004.18 1.34 7.42 7.42 0 004.18-1.34 1.46 1.46 0 001.46-2.47 3.32 3.32 0 000-3.73 1.46 1.46 0 00-.18-.28zM7.05 11.23a1.05 1.05 0 111.05-1.05 1.05 1.05 0 01-1.05 1.05zm5.9 3.55a3.67 3.67 0 01-2.95 1.03 3.67 3.67 0 01-2.95-1.03.28.28 0 010-.4.28.28 0 01.4 0 3.12 3.12 0 002.55.88 3.12 3.12 0 002.55-.88.28.28 0 01.4 0 .28.28 0 010 .4zm-.1-2.5a1.05 1.05 0 111.05-1.05 1.05 1.05 0 01-1.05 1.05z" />
                        </svg>
                        <span className="reddit-wordmark">reddit</span>
                    </div>
                </Link>
            </div>

            <div className="header-center" id="search-slot">
                <Search />
            </div>

            {!isLoggedIn ? (
                <div className="header-right">
                    <button className="btn-signup" id="headerSignupBtn" onClick={() => openAuthModal('Sign Up')}>
                        Sign Up
                    </button>
                    <button className="btn-login" id="headerLoginBtn" onClick={() => openAuthModal('Log In')}>
                        Log In
                    </button>
                    <button
                        className="btn-more rc-display-toggle"
                        id="headerDisplayBtn"
                        title="Toggle dark mode"
                        aria-label="Toggle dark mode"
                        onClick={toggleDarkMode}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    </button>
                    <div className="more-menu-wrapper">
                        <button
                            className="btn-more"
                            id="headerMoreBtn"
                            aria-label="More options"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMoreOpen(prev => !prev);
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <circle cx="4" cy="10" r="2" />
                                <circle cx="10" cy="10" r="2" />
                                <circle cx="16" cy="10" r="2" />
                            </svg>
                        </button>
                        <div className={`more-dropdown${moreOpen ? '' : ' hidden'}`} id="moreDropdown">
                            <Link to="/page.html?p=help" className="dropdown-item" onClick={() => setMoreOpen(false)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4" />
                                    <path d="M12 8h.01" />
                                </svg>
                                Help Center
                            </Link>
                            <Link to="/page.html?p=user-agreement" className="dropdown-item" onClick={() => setMoreOpen(false)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                                Terms & Policies
                            </Link>
                            <div className="dropdown-divider"></div>
                            <a
                                href="#"
                                className="dropdown-item"
                                id="moreLoginLink"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setMoreOpen(false);
                                    openAuthModal('Log In');
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                                    <polyline points="10 17 15 12 10 7" />
                                    <line x1="15" y1="12" x2="3" y2="12" />
                                </svg>
                                Log In / Sign Up
                            </a>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="header-right header-right-authed">
                    <Link to="/page.html?p=advertise" className="header-icon-btn" id="headerAdBtn" title="Advertise on Reddit">
                        <span className="ad-badge-icon">AD</span>
                    </Link>

                    <button
                        className="header-icon-btn rc-badge-host"
                        id="headerChatBtn"
                        title="Chat"
                        aria-label="Open chats"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleChatModal();
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className={`rc-count-badge${chatUnread ? '' : ' hidden'}`} id="chatUnreadBadge">
                            {chatUnread > 99 ? '99+' : chatUnread}
                        </span>
                    </button>

                    <Link to="/submit.html" className="btn-create-post" id="headerCreateBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Create</span>
                    </Link>

                    <div className="rc-notif-wrapper">
                        <button
                            className="header-icon-btn rc-badge-host"
                            id="headerBellBtn"
                            title="Notifications"
                            aria-label="Open notifications"
                            aria-haspopup="true"
                            aria-expanded={notifOpen}
                            onClick={handleBellClick}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                            <span className={`rc-count-badge${notifUnread ? '' : ' hidden'}`} id="notifUnreadBadge">
                                {notifUnread > 99 ? '99+' : notifUnread}
                            </span>
                        </button>
                        <div className={`rc-notif-dropdown${notifOpen ? '' : ' hidden'}`} id="notifDropdown" role="menu" onClick={e => e.stopPropagation()}>
                            <div className="rc-notif-header">
                                <strong>Notifications</strong>
                                <button type="button" className="rc-link-btn" id="notifMarkAllBtn" onClick={handleMarkAllRead}>
                                    Mark all as read
                                </button>
                            </div>
                            <div className="rc-notif-list" id="notifList">
                                {notifLoading ? (
                                    <p className="rc-notif-empty">Loading…</p>
                                ) : !notifications.length ? (
                                    <p className="rc-notif-empty">No notifications yet. When someone replies to you or messages you, it shows up here.</p>
                                ) : (
                                    notifications.map(n => (
                                        <button
                                            key={n.id}
                                            className={`rc-notif-item ${n.read ? '' : 'unread'}`}
                                            data-id={n.id}
                                            data-link={n.link}
                                            onClick={() => handleNotifItemClick(n)}
                                        >
                                            <span className="rc-notif-icon">{NOTIF_ICONS[n.type] || '🔔'}</span>
                                            <span className="rc-notif-text">
                                                {n.text}
                                                <small>{timeAgo(n.createdAt)}</small>
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="user-profile-wrapper">
                        <button
                            className="btn-user-avatar"
                            id="userProfileBtn"
                            aria-label="User profile"
                            aria-expanded={profileOpen}
                            aria-haspopup="true"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMoreOpen(false);
                                setNotifOpen(false);
                                setProfileOpen(prev => !prev);
                            }}
                        >
                            <div className="avatar-circle" id="headerAvatar">
                                <UserAvatar user={user} size={32} />
                            </div>
                            <span className="online-indicator"></span>
                        </button>

                        <div className={`profile-dropdown-menu${profileOpen ? '' : ' hidden'}`} id="profileDropdown" role="menu" onClick={e => e.stopPropagation()}>
                            <Link
                                to={`/user.html?u=${encodeURIComponent(user?.username || '')}`}
                                className="profile-menu-item profile-user-header"
                                id="profileViewLink"
                                role="menuitem"
                                onClick={() => setProfileOpen(false)}
                            >
                                <div className="profile-header-avatar" id="dropdownAvatar">
                                    <UserAvatar user={user} size={36} />
                                </div>
                                <div className="profile-header-info">
                                    <span className="profile-title">View Profile</span>
                                    <span className="profile-username" id="dropdownUsername">u/{user?.username}</span>
                                </div>
                            </Link>

                            <Link to="/settings.html?tab=profile" className="profile-menu-item" role="menuitem" onClick={() => setProfileOpen(false)}>
                                <span className="menu-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20.38 3.46L16 2a4 4 0 00-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10a2 2 0 002 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
                                    </svg>
                                </span>
                                <span className="menu-label">Edit Avatar</span>
                            </Link>

                            <Link to="/submit.html?drafts=1" className="profile-menu-item" role="menuitem" onClick={() => setProfileOpen(false)}>
                                <span className="menu-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                </span>
                                <span className="menu-label">Drafts</span>
                            </Link>

                            <Link
                                to={`/user.html?u=${encodeURIComponent(user?.username || '')}&tab=achievements`}
                                className="profile-menu-item"
                                id="profileAchievementsLink"
                                role="menuitem"
                                onClick={() => setProfileOpen(false)}
                            >
                                <span className="menu-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
                                        <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
                                        <path d="M4 22h16" />
                                        <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                                        <path d="M18 4H6v7a6 6 0 0012 0V4z" />
                                    </svg>
                                </span>
                                <span className="menu-label">Achievements</span>
                                <span className="menu-extra-text" id="achievementsCount">
                                    {user?.achievementsUnlocked || 0} unlocked
                                </span>
                            </Link>

                            <Link to="/page.html?p=earn" className="profile-menu-item profile-item-stacked" role="menuitem" onClick={() => setProfileOpen(false)}>
                                <span className="menu-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 6v12M15 9.5a2.5 2.5 0 00-5 0c0 2.5 5 1.5 5 4a2.5 2.5 0 01-5 0" />
                                    </svg>
                                </span>
                                <div className="menu-label-container">
                                    <span className="menu-label">Earn</span>
                                    <span className="menu-subtext">Earn cash on Reddit</span>
                                </div>
                            </Link>

                            <Link to="/page.html?p=premium" className="profile-menu-item" role="menuitem" onClick={() => setProfileOpen(false)}>
                                <span className="menu-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                </span>
                                <span className="menu-label">Premium</span>
                            </Link>

                            <div className="profile-menu-item profile-item-toggle" role="menuitem">
                                <div className="profile-item-left">
                                    <span className="menu-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                            <path d="M12 8v4" />
                                            <circle cx="12" cy="16" r="0.5" />
                                        </svg>
                                    </span>
                                    <span className="menu-label">Mod Mode</span>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        id="modModeToggle"
                                        checked={user?.prefs?.modMode !== false}
                                        onChange={handleModModeChange}
                                    />
                                    <span className="toggle-slider">
                                        <svg className="toggle-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </span>
                                </label>
                            </div>

                            <button
                                type="button"
                                className="profile-menu-item profile-btn-action"
                                id="displayModeBtn"
                                role="menuitem"
                                onClick={toggleDarkMode}
                            >
                                <span className="menu-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="5" />
                                        <line x1="12" y1="1" x2="12" y2="3" />
                                        <line x1="12" y1="21" x2="12" y2="23" />
                                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                        <line x1="1" y1="12" x2="3" y2="12" />
                                        <line x1="21" y1="12" x2="23" y2="12" />
                                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                    </svg>
                                </span>
                                <span className="menu-label">Display Mode</span>
                                <span className="menu-extra-text" id="displayModeLabel">
                                    {darkMode ? 'Dark' : 'Light'}
                                </span>
                            </button>

                            <button
                                type="button"
                                className="profile-menu-item profile-btn-action"
                                id="profileLogoutBtn"
                                role="menuitem"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setProfileOpen(false);
                                    logout();
                                }}
                            >
                                <span className="menu-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                </span>
                                <span className="menu-label">Log Out</span>
                            </button>

                            <div className="profile-menu-divider"></div>

                            <Link to="/page.html?p=advertise" className="profile-menu-item" role="menuitem" onClick={() => setProfileOpen(false)}>
                                <span className="menu-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                                    </svg>
                                </span>
                                <span className="menu-label">Advertise on Reddit</span>
                            </Link>

                            <Link to="/page.html?p=reddit-pro" className="profile-menu-item" role="menuitem" onClick={() => setProfileOpen(false)}>
                                <span className="menu-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                </span>
                                <span className="menu-label">Try Reddit Pro</span>
                                <span className="menu-beta-badge">BETA</span>
                            </Link>

                            <div className="profile-menu-divider"></div>

                            <Link to="/settings.html" className="profile-menu-item" role="menuitem" onClick={() => setProfileOpen(false)}>
                                <span className="menu-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                                    </svg>
                                </span>
                                <span className="menu-label">Settings</span>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
