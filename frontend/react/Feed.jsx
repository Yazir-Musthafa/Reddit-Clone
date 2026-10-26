import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../js/api.js';
import { useAuth } from './AuthContext.jsx';
import { navigateQuery } from './navigation.js';
import { readLocal, writeLocal } from '../js/utils.js';
import { Markup, renderView } from './render.jsx';
import PostCard from './PostCard.jsx';

const SORT_LABELS = { best: 'Best', hot: 'Hot', new: 'New', top: 'Top', rising: 'Rising' };
const TIME_LABELS = { hour: 'Now', day: 'Today', week: 'This Week', month: 'This Month', year: 'This Year', all: 'All Time' };
const CHEVRON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
const SORTS = ['best', 'hot', 'new', 'top', 'rising'];

function ViewIcon({ view }) {
    return view === 'card'
        ? <><rect x="3" y="3" width="18" height="18" rx="2.5" /><line x1="3" y1="9" x2="21" y2="9" /></>
        : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>;
}

function Dropdown({ id, buttonClass, label, header, open, toggle, children }) {
    return <div className="sort-dropdown-wrapper">
        <button className={buttonClass} id={`${id}Btn`} aria-expanded={open} aria-haspopup="true" onClick={e => { e.stopPropagation(); toggle(); }}>{label}</button>
        <div className={`sort-popup-menu${open ? '' : ' hidden'}`} id={`${id}Menu`} role="menu">
            <div className="dropdown-section-header">{header}</div>{children}
        </div>
    </div>;
}

export default function Feed({ endpoint, resultsKey = 'posts', sorts = SORTS, defaultSort = 'best', showCommunity = true, showSort = true,
    emptyHtml = '<div class="rc-empty-state"><h3>No posts yet</h3><p>Check back later.</p></div>', headerHtml = '', className = '', controls }) {
    const { user } = useAuth();
    const params = new URLSearchParams(window.location.search);
    const [sort, setSort] = useState(() => sorts.includes(params.get('sort')) ? params.get('sort') : defaultSort);
    const [time, setTime] = useState(() => TIME_LABELS[params.get('t')] ? params.get('t') : 'day');
    const [view, setView] = useState(() => readLocal('rc_view', null) || user?.prefs?.defaultView || 'card');
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const [menu, setMenu] = useState(null);
    const [revision, setRevision] = useState(0);
    const sentinel = useRef(null);
    const request = useRef({ generation: 0, page: 0, busy: false, more: true });
    const loadMore = useCallback(async () => {
        const state = request.current;
        if (state.busy || !state.more) return;
        state.busy = true;
        setLoading(true); setError('');
        try {
            const data = await api.get(endpoint({ sort, t: time, page: state.page }));
            if (request.current !== state) return;
            setPosts(previous => [...previous, ...(data[resultsKey] || [])]);
            state.page += 1; state.more = !!data.hasMore;
            setHasMore(state.more);
        } catch (err) {
            if (request.current !== state) return;
            state.more = err.status !== 403 && err.status !== 404;
            setError(err.message);
        } finally {
            state.busy = false;
            if (request.current === state) setLoading(false);
        }
    }, [endpoint, resultsKey, sort, time]);
    useEffect(() => {
        request.current = { page: 0, busy: false, more: true };
        setPosts([]); setHasMore(true); loadMore();
        return () => { request.current = { page: 0, busy: true, more: false }; };
    }, [loadMore, revision]);
    useEffect(() => {
        const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) loadMore(); }, {
            root: sentinel.current?.closest('#feed-container') || null, rootMargin: '600px 0px'
        });
        if (sentinel.current) observer.observe(sentinel.current);
        return () => observer.disconnect();
    }, [loadMore, revision]);
    useEffect(() => {
        const close = () => setMenu(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, []);
    useEffect(() => { if (controls) controls.reload = () => setRevision(n => n + 1); }, [controls]);
    function update(nextSort, nextTime) {
        setSort(nextSort); setTime(nextTime); setMenu(null);
        const url = new URL(window.location.href);
        url.searchParams.set('sort', nextSort);
        if (nextSort === 'top') url.searchParams.set('t', nextTime); else url.searchParams.delete('t');
        navigateQuery(url, { replace: true });
    }
    const dropdown = (id, props, children) => <Dropdown id={id} {...props} open={menu === id} toggle={() => setMenu(menu === id ? null : id)}>{children}</Dropdown>;
    return <div className={`feed-container ${className}`}>
        <Markup html={headerHtml} />
        <div className="feed-sort-row"><div className="sort-left-controls">
            {showSort && dropdown('feedSort', { buttonClass: 'btn-feed-sort', header: 'Sort by', label: <><span id="currentSortLabel">{SORT_LABELS[sort]}</span><Markup html={CHEVRON} /></> },
                sorts.map(s => <button key={s} className={`sort-menu-item ${s === sort ? 'active' : ''}`} data-sort={s} onClick={() => update(s, time)}><span className="sort-menu-text">{SORT_LABELS[s]}</span></button>))}
            {showSort && <div className={sort === 'top' ? '' : 'hidden'} id="feedTimeWrapper">{dropdown('feedTime', { buttonClass: 'btn-feed-sort', header: 'Top posts from', label: <><span id="currentTimeLabel">{TIME_LABELS[time]}</span><Markup html={CHEVRON} /></> },
                Object.entries(TIME_LABELS).map(([k, v]) => <button key={k} className={`sort-menu-item ${k === time ? 'active' : ''}`} data-time={k} onClick={() => update(sort, k)}><span className="sort-menu-text">{v}</span></button>))}</div>}
            {dropdown('feedView', { buttonClass: 'btn-view-mode', header: 'View', label: <><svg className="view-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ViewIcon view={view} /></svg><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="chevron-down"><polyline points="6 9 12 15 18 9" /></svg></> },
                ['card', 'compact'].map(v => <button key={v} className={`sort-menu-item ${v === view ? 'active' : ''}`} data-view={v} onClick={() => { setView(v); setMenu(null); writeLocal('rc_view', v); }}>
                    <span className="sort-menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ViewIcon view={v} /></svg></span>
                    <span className="sort-menu-text">{v === 'card' ? 'Card' : 'Compact'}</span>
                </button>))}
        </div></div>
        <div className={`posts-feed ${view === 'compact' ? 'compact-view-active' : ''}`} id="postsFeedList">
            {posts.map(post => <PostCard key={`${view}:${post.id}`} post={post} view={view} showCommunity={showCommunity} />)}
        </div>
        <div className="rc-feed-status" id="feedStatus">
            {loading ? <div className="rc-spinner" aria-label="Loading" /> : error ? <div className="rc-empty-state"><p>{error}</p><button className="ui-btn ui-btn-secondary" id="feedRetryBtn" onClick={loadMore}>Try again</button></div>
                : !posts.length ? <Markup html={emptyHtml} /> : !hasMore ? <p className="rc-feed-end">You've reached the end</p> : null}
        </div>
        <div className="rc-feed-sentinel" id="feedSentinel" ref={sentinel} />
    </div>;
}

export function mountFeed(container, props) {
    const controls = {};
    renderView(container, <Feed {...props} controls={controls} />);
    return controls;
}
