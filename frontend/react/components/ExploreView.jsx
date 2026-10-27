import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import { formatCount } from '../../js/utils.js';

const HIDDEN_TOPICS = ['Adult Content', 'Mature Topics'];

export default function ExploreView() {
    const { user, isJoined, toggleJoin } = useAuth();
    const [category, setCategory] = useState('all');
    const [topics, setTopics] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Specific topic page
    const [topicCommunities, setTopicCommunities] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);

    const tabsScrollRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        const showMature = !!user?.prefs?.showMature;

        Promise.all([
            api.get('/communities/topics'),
            api.get('/communities?limit=100')
        ]).then(([topicData, commData]) => {
            if (!mounted) return;
            const filteredTopics = (topicData.topics || []).filter(t => showMature || !HIDDEN_TOPICS.includes(t));
            setTopics(filteredTopics);
            setCommunities(commData.communities || []);
            setLoading(false);
        }).catch(err => {
            if (!mounted) return;
            setError(err.message);
            setLoading(false);
        });

        return () => { mounted = false; };
    }, [user]);

    // Load topic page
    useEffect(() => {
        if (category === 'all') return;
        let mounted = true;
        setPage(0);
        setTopicCommunities([]);
        api.get(`/communities?topic=${encodeURIComponent(category)}&limit=24&page=0`)
            .then(data => {
                if (!mounted) return;
                setTopicCommunities(data.communities || []);
                setHasMore(!!data.hasMore);
                setPage(1);
            })
            .catch(() => {});
        return () => { mounted = false; };
    }, [category]);

    const loadMoreTopic = async () => {
        try {
            const data = await api.get(`/communities?topic=${encodeURIComponent(category)}&limit=24&page=${page}`);
            setTopicCommunities(prev => [...prev, ...(data.communities || [])]);
            setHasMore(!!data.hasMore);
            setPage(prev => prev + 1);
        } catch {}
    };

    const topicsWithCommunities = topics.filter(t => communities.some(c => c.topic === t));

    const renderCard = (c) => {
        const joined = isJoined(c.name);
        return (
            <Link key={c.id || c.name} className="explore-community-card" to={`/community.html?name=${encodeURIComponent(c.name)}`}>
                <div className="community-avatar-circle no-invert" style={{ backgroundColor: c.color || '#FF4500' }}>
                    <span>{c.icon || c.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="community-info-box">
                    <h3 className="community-name-heading">r/{c.name}</h3>
                    <span className="community-stats-meta">{formatCount(c.memberCount)} members</span>
                    <p className="community-desc-text">{c.description}</p>
                </div>
                <button
                    type="button"
                    className={`btn-community-join${joined ? ' joined' : ''}`}
                    data-join-community={c.name}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleJoin(c);
                    }}
                >
                    {joined ? 'Joined' : 'Join'}
                </button>
            </Link>
        );
    };

    return (
        <div className="explore-page-container">
            <h1 className="explore-page-title">Explore Communities</h1>

            <div className="explore-tabs-wrapper">
                <div className="explore-tabs-scroll" id="exploreTabsScroll" ref={tabsScrollRef} role="tablist">
                    <button
                        type="button"
                        className={`explore-tab-pill${category === 'all' ? ' active' : ''}`}
                        data-category="all"
                        role="tab"
                        onClick={() => setCategory('all')}
                    >
                        All
                    </button>
                    {topicsWithCommunities.map(t => (
                        <button
                            key={t}
                            type="button"
                            className={`explore-tab-pill${category === t ? ' active' : ''}`}
                            data-category={t}
                            role="tab"
                            onClick={() => setCategory(t)}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className="explore-tab-next-btn"
                    id="exploreTabsNextBtn"
                    aria-label="Scroll next categories"
                    onClick={() => {
                        if (tabsScrollRef.current) {
                            tabsScrollRef.current.scrollBy({ left: 240, behavior: 'smooth' });
                        }
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>

            <div className="explore-sections-container" id="exploreContent">
                {loading ? (
                    <div className="rc-spinner" aria-label="Loading"></div>
                ) : error ? (
                    <div className="rc-empty-state"><p>{error}</p></div>
                ) : category === 'all' ? (
                    (() => {
                        const interests = new Set(user?.interests || []);
                        const recommended = communities.filter(c => !isJoined(c.name)).slice(0, 6);
                        const sections = [
                            { title: user ? 'Recommended for you' : 'Most popular', topic: null, items: recommended },
                            ...topicsWithCommunities
                                .sort((a, b) => Number(interests.has(b)) - Number(interests.has(a)))
                                .map(t => ({ title: t, topic: t, items: communities.filter(c => c.topic === t) }))
                        ].filter(s => s.items.length);

                        return sections.map(s => (
                            <section key={s.title} className="explore-category-section">
                                <h2 className="category-section-title">{s.title}</h2>
                                <div className="community-cards-grid">
                                    {s.items.slice(0, 6).map(renderCard)}
                                </div>
                                {s.topic && s.items.length > 6 && (
                                    <div className="show-more-wrapper">
                                        <button
                                            type="button"
                                            className="btn-show-more-category"
                                            data-topic={s.topic}
                                            onClick={() => setCategory(s.topic)}
                                        >
                                            Show more
                                        </button>
                                    </div>
                                )}
                            </section>
                        ));
                    })()
                ) : (
                    <section className="explore-category-section">
                        <h2 className="category-section-title">{category} Communities</h2>
                        <div className="community-cards-grid" id="topicGrid">
                            {!topicCommunities.length ? (
                                <p className="rc-muted-text">No communities in this topic yet.</p>
                            ) : (
                                topicCommunities.map(renderCard)
                            )}
                        </div>
                        {hasMore && (
                            <div className="show-more-wrapper" id="topicMoreWrapper">
                                <button
                                    type="button"
                                    className="btn-show-more-category"
                                    id="topicMoreBtn"
                                    onClick={loadMoreTopic}
                                >
                                    Show more
                                </button>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
