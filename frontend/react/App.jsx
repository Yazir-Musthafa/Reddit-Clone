import React, { lazy, Suspense, useLayoutEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router';
import Toasts from './Toasts.jsx';
import { registerNavigation } from './navigation.js';

const pages = {
    'index.html': lazy(() => import('../js/app.js')),
    'post.html': lazy(() => import('../js/pages/post-page.js')),
    'community.html': lazy(() => import('../js/pages/community-page.js')),
    'communities.html': lazy(() => import('../js/pages/communities-page.js')),
    'user.html': lazy(() => import('../js/pages/user-page.js')),
    'search.html': lazy(() => import('../js/pages/search-page.js')),
    'submit.html': lazy(() => import('../js/submit-app.js')),
    'settings.html': lazy(() => import('../js/pages/settings-page.js')),
    'careers.html': lazy(() => import('../js/pages/careers-page.js')),
    'press.html': lazy(() => import('../js/pages/press-page.js')),
    'page.html': lazy(() => import('../js/pages/info-page.js'))
};
const withRightColumn = new Set(['index.html', 'post.html', 'search.html', 'submit.html']);

export default function App() {
    const navigate = useNavigate();
    useLayoutEffect(() => registerNavigation(navigate), [navigate]);
    return <Routes>
        <Route path="/" element={<PageLayout filename="index.html" Page={pages['index.html']} />} />
        {Object.entries(pages).map(([filename, Page]) => <Route key={filename} path={`/${filename}`} element={<PageLayout filename={filename} Page={Page} />} />)}
        <Route path="*" element={<PageLayout filename="page.html" Page={pages['page.html']} />} />
    </Routes>;
}

function PageLayout({ filename, Page }) {
    const right = withRightColumn.has(filename);
    return <>
        <div id="app">
            <div id="header-container" />
            <main className={`main-layout${right ? '' : ' no-right-col'}`}>
                <div id="sidebar-container" />
                <div id="feed-container" />
                {right && <div className="right-column-container" />}
            </main>
        </div>
        <div id="chats-slot" />
        <div id="community-modal-slot" />
        <Toasts />
        <Suspense fallback={null}><Page /></Suspense>
    </>;
}
