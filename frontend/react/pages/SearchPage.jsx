import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import AppLayout from '../layout/AppLayout.jsx';
import Feed from '../Feed.jsx';
import { CommunityIcon, UserAvatar } from '../components/Avatars.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import { formatCount, timeAgo, formatCommentBody } from '../../js/utils.js';

const TABS = {
    posts: 'Posts',
    communities: 'Communities',
    comments: 'Comments',
    people: 'People'
};

export default function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { isJoined, toggleJoin } = useAuth();

    const q = (searchParams.get('q') || '').trim();
    const typeParam = searchParams.get('type') || 'posts';
    const activeTab = Object.hasOwn(TABS, typeParam) ? typeParam : 'posts';

    useEffect(() => {
        if (q) {
            document.title = `${q} - Reddit Search`;
        } else {
            document.title = 'Search - Reddit';
        }
    }, [q]);

    const handleTabClick = (key) => {
        const next = new URLSearchParams(searchParams);
        next.set('type', key);
        next.delete('sort');
        next.delete('t');
        setSearchParams(next, { replace: true });
    };

    if (!q) {
        return (
            <AppLayout rightColumn={true}>
                <div className="rc-empty-state">
                    <h3>Search Reddit</h3>
                    <p>Type something in the search bar above and press Enter.</p>
                </div>
            </AppLayout>
        );
    }

    const noResults = (
        <div className="rc-empty-state">
            <h3>Hm... we couldn't find any results for “{q}”</h3>
            <p>Double-check your spelling or try different keywords.</p>
        </div>
    );

    return (
        <AppLayout rightColumn={true}>
            <div className="rc-search-page">
                <h1 className="rc-view-title">Results for “{q}”</h1>
                <nav className="rc-tabs" role="tablist">
                    {Object.entries(TABS).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            className={`rc-tab ${key === activeTab ? 'active' : ''}`}
                            data-tab={key}
                            role="tab"
                            onClick={() => handleTabClick(key)}
                        >
                            {label}
                        </button>
                    ))}
                </nav>

                <div id="searchResults">
                    {activeTab === 'posts' ? (
                        <Feed
                            key={`search:${q}`}
                            endpoint={({ sort, t, page }) => (
                                `/search?q=${encodeURIComponent(q)}&type=posts&sort=${sort}&t=${t}&page=${page}`
                            )}
                            resultsKey="results"
                            sorts={['top', 'new', 'hot']}
                            defaultSort="top"
                            emptyHtml={noResults}
                        />
                    ) : (
                        <SearchResultsList
                            key={`${q}:${activeTab}`}
                            query={q}
                            type={activeTab}
                            noResults={noResults}
                            isJoined={isJoined}
                            toggleJoin={toggleJoin}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function SearchResultsList({ query, type, noResults, isJoined, toggleJoin }) {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = (pageNum, append = false) => {
        setLoading(true);
        setError(null);
        api.get(`/search?q=${encodeURIComponent(query)}&type=${type}&page=${pageNum}`)
            .then(data => {
                const fetched = data.results || [];
                setItems(prev => append ? [...prev, ...fetched] : fetched);
                setHasMore(!!data.hasMore);
                setPage(pageNum + 1);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load(0, false);
    }, [query, type]);

    const handleJoinClick = async (e, community) => {
        e.preventDefault();
        await toggleJoin(community);
    };

    return (
        <div>
            <div className="rc-search-list" id="searchList">
                {items.map((item, idx) => {
                    if (type === 'communities') {
                        const joined = isJoined(item.name);
                        return (
                            <Link
                                key={item.name || idx}
                                className="rc-search-row"
                                to={`/community.html?name=${encodeURIComponent(item.name)}`}
                            >
                                <CommunityIcon community={item} size={40} />
                                <div className="rc-search-row-info">
                                    <strong>r/{item.name}</strong>
                                    <span className="rc-muted-text">
                                        {formatCount(item.memberCount)} members • {item.topic}
                                    </span>
                                    <p>{item.description}</p>
                                </div>
                                <button
                                    type="button"
                                    className={`btn-community-join ${joined ? 'joined' : ''}`}
                                    data-join-community={item.name}
                                    onClick={(e) => handleJoinClick(e, item)}
                                >
                                    {joined ? 'Joined' : 'Join'}
                                </button>
                            </Link>
                        );
                    }

                    if (type === 'people') {
                        return (
                            <Link
                                key={item.username || idx}
                                className="rc-search-row"
                                to={`/user.html?u=${encodeURIComponent(item.username)}`}
                            >
                                <UserAvatar user={item} size={40} />
                                <div className="rc-search-row-info">
                                    <strong>u/{item.username}</strong>
                                    <span className="rc-muted-text">
                                        {formatCount(item.karma)} karma • joined {timeAgo(item.createdAt)}
                                    </span>
                                    {item.bio && <p>{item.bio}</p>}
                                </div>
                            </Link>
                        );
                    }

                    // Comments
                    return (
                        <Link
                            key={item.id || idx}
                            className="rc-profile-comment"
                            to={`/post.html?id=${encodeURIComponent(item.post?.id)}#comment-${item.id}`}
                        >
                            <div className="rc-profile-comment-meta">
                                <CommunityIcon community={item.community} size={20} />
                                <strong>r/{item.community?.name}</strong>
                                <span className="rc-muted-text">• {item.post?.title}</span>
                            </div>
                            <div className="rc-muted-text rc-small">
                                <UserAvatar user={item.author} size={16} />{' '}
                                {item.author?.username} • {timeAgo(item.createdAt)}
                            </div>
                            <div
                                className="rc-comment-body"
                                dangerouslySetInnerHTML={{ __html: formatCommentBody(item.body) }}
                            />
                            <div className="rc-muted-text rc-small">⬆ {formatCount(item.score)} points</div>
                        </Link>
                    );
                })}
            </div>

            <div className="rc-feed-status" id="searchStatus">
                {loading ? (
                    <div className="rc-spinner" />
                ) : error ? (
                    <p className="rc-muted-text">{error}</p>
                ) : items.length === 0 ? (
                    noResults
                ) : hasMore ? (
                    <button
                        type="button"
                        className="ui-btn ui-btn-secondary"
                        id="searchMoreBtn"
                        onClick={() => load(page, true)}
                    >
                        Load more
                    </button>
                ) : null}
            </div>
        </div>
    );
}
