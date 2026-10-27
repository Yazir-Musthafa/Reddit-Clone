import React, { useEffect } from 'react';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import Chats from '../components/Chats.jsx';
import CommunityModal from '../components/CommunityModal.jsx';
import AuthModal from '../components/AuthModal.jsx';
import Toasts from '../Toasts.jsx';
import Footer from '../components/Footer.jsx';
import PopularCommunities from '../components/PopularCommunities.jsx';
import { useAuth } from '../AuthContext.jsx';

export default function AppLayout({
    children,
    rightColumn = true,
    rightColumnContent = null,
    showRecent = false
}) {
    const { sidebarCollapsed, mobileDrawerOpen, closeMobileDrawer } = useAuth();

    // Close mobile drawer on outside click
    useEffect(() => {
        if (!mobileDrawerOpen) return;
        const handleDocClick = (e) => {
            const sidebar = document.getElementById('sidebar-container');
            const toggle = document.getElementById('headerDrawerToggleBtn');
            if (sidebar && !sidebar.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
                closeMobileDrawer();
            }
        };
        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, [mobileDrawerOpen, closeMobileDrawer]);

    const mainLayoutClasses = [
        'main-layout',
        !rightColumn ? 'no-right-col' : '',
        sidebarCollapsed ? 'sidebar-collapsed' : ''
    ].filter(Boolean).join(' ');

    const sidebarContainerClasses = [
        sidebarCollapsed ? 'collapsed' : '',
        mobileDrawerOpen ? 'mobile-open' : ''
    ].filter(Boolean).join(' ');

    return (
        <>
            <div id="app">
                <div id="header-container">
                    <Header />
                </div>

                <main className={mainLayoutClasses}>
                    <div id="sidebar-container" className={sidebarContainerClasses}>
                        <Sidebar />
                    </div>

                    <div id="feed-container">
                        {children}
                    </div>

                    {rightColumn && (
                        <div className="right-column-container">
                            <div className="rc-right-scroll">
                                {rightColumnContent || (
                                    <div id="communities-container">
                                        <PopularCommunities showRecent={showRecent} />
                                    </div>
                                )}
                            </div>
                            <div id="footer-container">
                                <Footer />
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <div id="chats-slot">
                <Chats />
            </div>

            <div id="community-modal-slot">
                <CommunityModal />
            </div>

            <AuthModal />
            <Toasts />
        </>
    );
}
