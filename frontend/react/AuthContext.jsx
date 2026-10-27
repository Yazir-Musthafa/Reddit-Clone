import React, { createContext, useContext, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { api } from '../js/api.js';
import { authState } from '../js/auth-state.js';
import { isDarkMode, toggleDisplayMode } from '../js/display-mode.js';
import { showToast } from './Toasts.jsx';
import { showDialogGlobal } from './context/DialogContext.jsx';

const AuthContext = createContext(null);

let globalAuthControls = null;

export function AuthProvider({ children }) {
    const rawSession = useSyncExternalStore(
        listener => authState.subscribe(listener),
        () => authState.getState()
    );

    const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login', notice: '' });
    const [communityModalOpen, setCommunityModalOpen] = useState(false);
    const [chatModal, setChatModal] = useState({ isOpen: false, activeUser: null });
    const [darkMode, setDarkMode] = useState(() => isDarkMode());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem('rc_sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    useEffect(() => {
        authState.load();
    }, []);

    const openAuthModal = useCallback((mode = 'login', options = {}) => {
        setAuthModal({
            isOpen: true,
            mode: String(mode).toLowerCase() === 'sign up' || String(mode).toLowerCase() === 'signup' ? 'signup' : mode === 'reset' ? 'reset' : 'login',
            notice: options.notice || ''
        });
    }, []);

    const closeAuthModal = useCallback(() => {
        setAuthModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const openCommunityModal = useCallback(() => {
        setCommunityModalOpen(true);
    }, []);

    const closeCommunityModal = useCallback(() => {
        setCommunityModalOpen(false);
    }, []);

    const toggleChatModal = useCallback(() => {
        setChatModal(prev => ({ ...prev, isOpen: !prev.isOpen }));
    }, []);

    const openChatWith = useCallback((username) => {
        setChatModal({ isOpen: true, activeUser: username });
    }, []);

    const closeChatModal = useCallback(() => {
        setChatModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const toggleDark = useCallback(() => {
        const next = toggleDisplayMode();
        setDarkMode(next);
        return next;
    }, []);

    const toggleSidebar = useCallback(() => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem('rc_sidebar_collapsed', String(next));
            } catch {}
            return next;
        });
    }, []);

    const toggleMobileDrawer = useCallback(() => {
        setMobileDrawerOpen(prev => !prev);
    }, []);

    const closeMobileDrawer = useCallback(() => {
        setMobileDrawerOpen(false);
    }, []);

    const setUser = useCallback((user) => {
        authState.setUser(user);
    }, []);

    const refresh = useCallback(async () => {
        return authState.refresh();
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
            authState.setUser(null);
            showToast('Logged out');
        } catch (err) {
            showToast(err.message);
        }
    }, []);

    const isJoined = useCallback((communityName) => {
        return authState.isJoined(communityName);
    }, [rawSession.user]);

    const toggleJoinCommunity = useCallback(async (community) => {
        if (!rawSession.isLoggedIn) {
            openAuthModal('Log In');
            return null;
        }
        try {
            const result = await api.post(`/communities/${encodeURIComponent(community.name)}/join`);
            authState.markJoined(community, result.joined);
            showToast(result.joined ? `Joined r/${community.name}` : `Left r/${community.name}`);
            document.dispatchEvent(new CustomEvent('community:membership', { detail: { name: community.name, ...result } }));
            return result;
        } catch (err) {
            showToast(err.message);
            return null;
        }
    }, [rawSession.isLoggedIn, openAuthModal]);

    const requireLogin = useCallback(() => {
        if (rawSession.isLoggedIn) return true;
        openAuthModal('Log In');
        return false;
    }, [rawSession.isLoggedIn, openAuthModal]);

    const confirm = useCallback((message, options = {}) => {
        return showDialogGlobal({
            type: 'confirm',
            title: options.title || 'Are you sure?',
            message,
            confirmLabel: options.confirmLabel || 'Confirm',
            cancelLabel: options.cancelLabel || 'Cancel',
            danger: options.danger || false
        }).then(Boolean);
    }, []);

    const formDialog = useCallback((options) => {
        return showDialogGlobal({
            type: 'form',
            ...options
        });
    }, []);

    const openDialog = useCallback((options) => {
        return showDialogGlobal(options);
    }, []);

    const reportDialog = useCallback((targetType, id) => {
        const endpoint = targetType === 'Post' ? `/posts/${id}/report` : `/comments/${id}/report`;
        const REPORT_REASONS = ['Spam', 'Harassment', 'Hate', 'Misinformation', 'Sharing personal information', 'Breaks community rules', 'Self-harm or suicide', 'Other'];
        return showDialogGlobal({
            title: `Report ${targetType.toLowerCase()}`,
            subtitle: 'Thanks for looking out for yourself and your fellow redditors.',
            render: (close) => {
                return <ReportDialogBody endpoint={endpoint} reasons={REPORT_REASONS} close={close} />;
            }
        });
    }, []);

    // Register global accessors
    globalAuthControls = {
        openAuthModal,
        closeAuthModal,
        openCommunityModal,
        closeCommunityModal,
        toggleChatModal,
        openChatWith,
        closeChatModal,
        requireLogin,
        toggleJoinCommunity,
        confirm,
        formDialog,
        openDialog,
        reportDialog
    };

    const value = {
        ...rawSession,
        setUser,
        refresh,
        logout,
        isJoined,
        toggleJoin: toggleJoinCommunity,
        requireLogin,
        authModal,
        openAuthModal,
        closeAuthModal,
        communityModalOpen,
        openCommunityModal,
        closeCommunityModal,
        chatModal,
        toggleChatModal,
        openChatWith,
        closeChatModal,
        darkMode,
        toggleDarkMode: toggleDark,
        sidebarCollapsed,
        toggleSidebar,
        mobileDrawerOpen,
        toggleMobileDrawer,
        closeMobileDrawer,
        confirmDialog: confirm,
        formDialog,
        openDialog,
        reportDialog
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}

// Global bridge helpers so non-React or legacy event handlers trigger React state seamlessly
export function openAuthModalGlobal(mode, options) {
    if (globalAuthControls) globalAuthControls.openAuthModal(mode, options);
}

export function openCommunityModalGlobal() {
    if (globalAuthControls) globalAuthControls.openCommunityModal();
}

export function toggleChatsModalGlobal() {
    if (globalAuthControls) globalAuthControls.toggleChatModal();
}

export function openChatWithGlobal(username) {
    if (globalAuthControls) globalAuthControls.openChatWith(username);
}

function ReportDialogBody({ endpoint, reasons, close }) {
    const [selected, setSelected] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selected) return;
        setSubmitting(true);
        try {
            await api.post(endpoint, { reason: selected });
            showToast('Thanks for reporting. Moderators will review it.');
            close(true);
        } catch (err) {
            showToast(err.message);
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div className="ui-reason-list">
                {reasons.map(r => (
                    <button
                        key={r}
                        type="button"
                        className={`topic-pill-btn ui-reason ${r === selected ? 'selected' : ''}`}
                        data-reason={r}
                        onClick={() => setSelected(r)}
                    >
                        {r}
                    </button>
                ))}
            </div>
            <div className="ui-dialog-actions">
                <button type="button" className="ui-btn ui-btn-secondary" data-close onClick={() => close(false)}>Cancel</button>
                <button
                    type="button"
                    className="ui-btn ui-btn-primary"
                    data-submit
                    disabled={!selected || submitting}
                    onClick={handleSubmit}
                >
                    {submitting ? 'Submitting…' : 'Submit report'}
                </button>
            </div>
        </div>
    );
}
