import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link, useNavigate } from 'react-router';
import AppLayout from '../layout/AppLayout.jsx';
import Feed from '../Feed.jsx';
import { UserAvatar, CommunityIcon } from '../components/Avatars.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import {
    formatNumber, formatDate, formatCount, timeAgo, formatCommentBody
} from '../../js/utils.js';

const PUBLIC_TABS = ['posts', 'comments', 'achievements'];
const PRIVATE_TABS = ['saved', 'hidden', 'upvoted', 'downvoted'];
const TAB_LABELS = {
    posts: 'Posts',
    comments: 'Comments',
    achievements: 'Achievements',
    saved: 'Saved',
    hidden: 'Hidden',
    upvoted: 'Upvoted',
    downvoted: 'Downvoted'
};

export default function UserPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const params = useParams();
    const navigate = useNavigate();
    const { user: me, openChatModal } = useAuth();

    const username = params.username || searchParams.get('u') || me?.username;
    const tabParam = searchParams.get('tab') || 'posts';

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!username) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        api.get(`/users/${encodeURIComponent(username)}`)
            .then(({ user: fetched }) => {
                if (cancelled) return;
                setProfile(fetched);
                document.title = `${fetched.displayName || fetched.username} (u/${fetched.username}) - Reddit`;
            })
            .catch(err => {
                if (cancelled) return;
                setError(err.message || 'User not found');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [username]);

    const handleTabChange = (t) => {
        const nextParams = new URLSearchParams(searchParams);
        if (profile?.username) nextParams.set('u', profile.username);
        nextParams.set('tab', t);
        nextParams.delete('sort');
        nextParams.delete('t');
        setSearchParams(nextParams, { replace: true });
    };

    if (!username) {
        return (
            <AppLayout rightColumn={false}>
                <div className="rc-empty-state">
                    <h3>Log in to see your profile</h3>
                </div>
            </AppLayout>
        );
    }

    if (loading) {
        return (
            <AppLayout rightColumn={false}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                    <div className="rc-spinner" />
                </div>
            </AppLayout>
        );
    }

    if (error || !profile) {
        return (
            <AppLayout rightColumn={false}>
                <div className="rc-empty-state">
                    <h3>Sorry, nobody on Reddit goes by that name.</h3>
                    <p>{error}</p>
                    <Link className="ui-btn ui-btn-primary" to="/index.html">Go home</Link>
                </div>
            </AppLayout>
        );
    }

    const tabs = profile.isMe ? [...PUBLIC_TABS.slice(0, 2), ...PRIVATE_TABS, 'achievements'] : PUBLIC_TABS;
    const activeTab = tabs.includes(tabParam) ? tabParam : 'posts';

    const renderTabContent = () => {
        if (activeTab === 'comments') {
            return <UserCommentsView username={profile.username} isMe={profile.isMe} />;
        }
        if (activeTab === 'achievements') {
            return <UserAchievementsView achievements={profile.achievements || []} />;
        }

        const who = profile.isMe ? "You haven't" : `u/${profile.username} hasn't`;
        const configs = {
            posts: {
                sorts: ['new', 'hot', 'top'],
                empty: (
                    <div className="rc-empty-state">
                        <h3>{who} posted yet</h3>
                        <p>{profile.isMe ? 'Share something with a community.' : 'Check back later.'}</p>
                    </div>
                )
            },
            saved: {
                sorts: [],
                empty: (
                    <div className="rc-empty-state">
                        <h3>No saved posts yet</h3>
                        <p>Save posts from their ••• menu or the Save button to find them here.</p>
                    </div>
                )
            },
            hidden: {
                sorts: [],
                empty: (
                    <div className="rc-empty-state">
                        <h3>No hidden posts</h3>
                        <p>Posts you hide are listed here so you can unhide them.</p>
                    </div>
                )
            },
            upvoted: {
                sorts: [],
                empty: (
                    <div className="rc-empty-state">
                        <h3>No upvoted posts yet</h3>
                        <p>Posts you upvote show up here.</p>
                    </div>
                )
            },
            downvoted: {
                sorts: [],
                empty: (
                    <div className="rc-empty-state">
                        <h3>No downvoted posts yet</h3>
                        <p>Posts you downvote show up here.</p>
                    </div>
                )
            }
        };

        const config = configs[activeTab] || configs.posts;
        const encodedUser = encodeURIComponent(profile.username);

        return (
            <Feed
                key={`${encodedUser}:${activeTab}`}
                endpoint={({ sort, t, page }) => (
                    `/users/${encodedUser}/${activeTab}?sort=${sort}&t=${t}&page=${page}`
                )}
                sorts={config.sorts.length ? config.sorts : ['new']}
                defaultSort="new"
                showSort={config.sorts.length > 0}
                showCommunity={true}
                emptyHtml={config.empty}
            />
        );
    };

    const unlockedAchievements = (profile.achievements || []).filter(a => a.unlocked);

    return (
        <AppLayout rightColumn={false}>
            <div className="rc-profile-page">
                <div className="rc-page-grid">
                    <div className="rc-page-main">
                        <div className="rc-profile-header">
                            <div className="rc-profile-avatar">
                                <UserAvatar user={profile} size={72} />
                            </div>
                            <div>
                                <h1>{profile.displayName || profile.username}</h1>
                                <span className="rc-muted-text">u/{profile.username}</span>
                            </div>
                            <div className="rc-community-actions">
                                {profile.isMe ? (
                                    <>
                                        <Link className="ui-btn ui-btn-secondary" to="/settings.html?tab=profile">
                                            Edit profile
                                        </Link>
                                        <Link className="ui-btn ui-btn-primary" to="/submit.html">
                                            ＋ Create Post
                                        </Link>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn-primary"
                                        id="profileChatBtn"
                                        onClick={() => openChatModal(profile.username)}
                                    >
                                        💬 Chat
                                    </button>
                                )}
                            </div>
                        </div>

                        <nav className="rc-tabs" role="tablist">
                            {tabs.map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`rc-tab ${t === activeTab ? 'active' : ''}`}
                                    data-tab={t}
                                    role="tab"
                                    onClick={() => handleTabChange(t)}
                                >
                                    {TAB_LABELS[t]}
                                </button>
                            ))}
                        </nav>

                        <div id="profileTabContent">
                            {renderTabContent()}
                        </div>
                    </div>

                    <aside className="rc-page-aside">
                        <div className="rc-side-card">
                            <div
                                className="rc-side-card-banner no-invert"
                                style={{ backgroundColor: profile.bannerColor }}
                            />
                            <div className="rc-side-card-body">
                                <h3 className="rc-side-heading">{profile.displayName || profile.username}</h3>
                                {profile.bio && <p className="rc-side-desc">{profile.bio}</p>}
                                <div className="rc-side-stats rc-side-stats-3">
                                    <div><strong>{formatNumber(profile.postKarma)}</strong><span>Post karma</span></div>
                                    <div><strong>{formatNumber(profile.commentKarma)}</strong><span>Comment karma</span></div>
                                    <div><strong>{formatDate(profile.createdAt)}</strong><span>Cake day</span></div>
                                </div>
                                <div className="rc-side-meta">
                                    <span>📝 {formatNumber(profile.stats?.posts || 0)} posts • 💬 {formatNumber(profile.stats?.comments || 0)} comments</span>
                                </div>
                                <button
                                    type="button"
                                    className="rc-achievement-preview"
                                    data-view-achievements
                                    onClick={() => handleTabChange('achievements')}
                                >
                                    {unlockedAchievements.slice(0, 5).map(a => (
                                        <span key={a.id || a.name} title={a.name}>{a.icon}</span>
                                    ))}
                                    <small>{unlockedAchievements.length} achievements unlocked</small>
                                </button>
                            </div>
                        </div>

                        {(profile.moderated || []).length > 0 && (
                            <div className="rc-side-card">
                                <div className="rc-side-card-body">
                                    <h3 className="rc-side-heading">Moderator of these communities</h3>
                                    <div className="rc-mod-list">
                                        {profile.moderated.map(c => (
                                            <Link
                                                key={c.name}
                                                className="rc-mod-item"
                                                to={`/community.html?name=${encodeURIComponent(c.name)}`}
                                            >
                                                <CommunityIcon community={c} size={24} />
                                                <span>
                                                    r/{c.name}
                                                    <small className="rc-muted-text"> • {formatCount(c.memberCount)} members</small>
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}

function UserCommentsView({ username, isMe }) {
    const [comments, setComments] = useState([]);
    const [sort, setSort] = useState('new');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadComments = (pageNum, sortVal, append = false) => {
        setLoading(true);
        setError(null);
        api.get(`/users/${encodeURIComponent(username)}/comments?sort=${sortVal}&page=${pageNum}`)
            .then(data => {
                const fetched = data.comments || [];
                setComments(prev => append ? [...prev, ...fetched] : fetched);
                setHasMore(!!data.hasMore);
                setPage(pageNum + 1);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadComments(0, sort, false);
    }, [username, sort]);

    return (
        <div>
            <div className="feed-sort-row">
                <select
                    className="rc-inline-select"
                    id="profileCommentSort"
                    aria-label="Sort comments"
                    value={sort}
                    onChange={e => {
                        setSort(e.target.value);
                    }}
                >
                    <option value="new">New</option>
                    <option value="top">Top</option>
                </select>
            </div>

            <div className="rc-profile-comments" id="profileComments">
                {comments.map(c => (
                    <Link
                        key={c.id}
                        className="rc-profile-comment"
                        to={`/post.html?id=${encodeURIComponent(c.post.id)}#comment-${c.id}`}
                    >
                        <div className="rc-profile-comment-meta">
                            <CommunityIcon community={c.community} size={20} />
                            <strong>r/{c.community.name}</strong>
                            <span className="rc-muted-text">• {c.post.title}</span>
                        </div>
                        <div className="rc-muted-text rc-small">
                            {username} commented {timeAgo(c.createdAt)}{c.edited ? ' • edited' : ''}
                        </div>
                        <div
                            className="rc-comment-body"
                            dangerouslySetInnerHTML={{ __html: formatCommentBody(c.body) }}
                        />
                        <div className="rc-muted-text rc-small">⬆ {formatCount(c.score)} points</div>
                    </Link>
                ))}
            </div>

            <div className="rc-feed-status" id="profileCommentsStatus">
                {loading ? (
                    <div className="rc-spinner" />
                ) : error ? (
                    <p className="rc-muted-text">{error}</p>
                ) : comments.length === 0 ? (
                    <div className="rc-empty-state">
                        <h3>{isMe ? "You haven't" : `u/${username} hasn't`} commented yet</h3>
                    </div>
                ) : hasMore ? (
                    <button
                        type="button"
                        className="ui-btn ui-btn-secondary"
                        id="moreCommentsBtn"
                        onClick={() => loadComments(page, sort, true)}
                    >
                        Load more
                    </button>
                ) : (
                    <p className="rc-feed-end">That's all the comments</p>
                )}
            </div>
        </div>
    );
}

function UserAchievementsView({ achievements }) {
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    return (
        <div>
            <p className="rc-muted-text" style={{ margin: '12px 0' }}>
                {unlockedCount} of {achievements.length} unlocked
            </p>
            <div className="rc-achievement-grid">
                {achievements.map(a => (
                    <div
                        key={a.id || a.name}
                        className={`rc-achievement ${a.unlocked ? 'unlocked' : 'locked'}`}
                    >
                        <span className="rc-achievement-icon">{a.unlocked ? a.icon : '🔒'}</span>
                        <strong>{a.name}</strong>
                        <small>{a.description}</small>
                    </div>
                ))}
            </div>
        </div>
    );
}
