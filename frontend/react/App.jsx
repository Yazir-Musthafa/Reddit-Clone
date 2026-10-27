import React, { useLayoutEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router';
import { registerNavigation } from './navigation.js';

import HomePage from './pages/HomePage.jsx';
import PostPage from './pages/PostPage.jsx';
import CommunityPage from './pages/CommunityPage.jsx';
import CommunitiesPage from './pages/CommunitiesPage.jsx';
import UserPage from './pages/UserPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import SubmitPage from './pages/SubmitPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import CareersPage from './pages/CareersPage.jsx';
import PressPage from './pages/PressPage.jsx';
import InfoPage from './pages/InfoPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
    const navigate = useNavigate();
    useLayoutEffect(() => registerNavigation(navigate), [navigate]);

    return (
        <Routes>
            {/* Home / Feeds */}
            <Route path="/" element={<HomePage />} />
            <Route path="/index.html" element={<HomePage />} />

            {/* Post Detail */}
            <Route path="/post.html" element={<PostPage />} />
            <Route path="/post/:id" element={<PostPage />} />

            {/* Community View */}
            <Route path="/community.html" element={<CommunityPage />} />
            <Route path="/r/:name" element={<CommunityPage />} />

            {/* Communities Management */}
            <Route path="/communities.html" element={<CommunitiesPage />} />
            <Route path="/communities" element={<CommunitiesPage />} />

            {/* User Profile */}
            <Route path="/user.html" element={<UserPage />} />
            <Route path="/u/:username" element={<UserPage />} />

            {/* Search */}
            <Route path="/search.html" element={<SearchPage />} />
            <Route path="/search" element={<SearchPage />} />

            {/* Submit / Create Post */}
            <Route path="/submit.html" element={<SubmitPage />} />
            <Route path="/submit" element={<SubmitPage />} />

            {/* User Settings */}
            <Route path="/settings.html" element={<SettingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Careers */}
            <Route path="/careers.html" element={<CareersPage />} />
            <Route path="/careers" element={<CareersPage />} />

            {/* Press */}
            <Route path="/press.html" element={<PressPage />} />
            <Route path="/press" element={<PressPage />} />

            {/* Info / Policy / Help pages */}
            <Route path="/page.html" element={<InfoPage />} />

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
