import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../../js/api.js';
import { formatNumber, formatCount, readLocal, writeLocal } from '../../js/utils.js';
import { CommunityIcon } from './Avatars.jsx';

export default function PopularCommunities({ showRecent = false }) {
    const navigate = useNavigate();
    const [recentPosts, setRecentPosts] = useState(() => readLocal('rc_recent_posts', []));
    const [communities, setCommunities] = useState([]);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        let mounted = true;
        api.get('/communities?limit=10')
            .then(data => {
                if (mounted) setCommunities(data.communities || []);
            })
            .catch(() => {});
        return () => { mounted = false; };
    }, []);

    const handleClearRecent = () => {
        writeLocal('rc_recent_posts', []);
        setRecentPosts([]);
    };

    const shown = communities.slice(0, expanded ? 10 : 5);

    return (
        <div className="right-sidebar-widgets-wrapper">
            {showRecent && recentPosts.length > 0 && (
                <div className="recent-posts-card" id="recentPostsWidget">
                    <div className="recent-posts-header">
                        <h3 className="recent-posts-title">RECENT POSTS</h3>
                        <button type="button" className="btn-clear-recent" id="btnClearRecent" onClick={handleClearRecent}>
                            Clear
                        </button>
                    </div>

                    <div className="recent-posts-list" id="recentPostsList">
                        {recentPosts.map(p => (
                            <Link
                                key={p.id}
                                to={`/post.html?id=${encodeURIComponent(p.id)}`}
                                className="recent-post-item"
                            >
                                {p.thumb ? (
                                    <img src={p.thumb} alt="" className="recent-post-thumb" />
                                ) : (
                                    <div className="recent-post-thumb-fallback">
                                        <CommunityIcon community={p.community} size={28} />
                                    </div>
                                )}
                                <div className="recent-post-info">
                                    <span className="recent-post-community">r/{p.community?.name}</span>
                                    <h4 className="recent-post-title">{p.title}</h4>
                                    <span className="recent-post-stats">
                                        {formatCount(p.score)} upvotes • {formatCount(p.commentCount)} comments
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="communities-card">
                <h3 className="communities-title">POPULAR COMMUNITIES</h3>

                <div className="communities-list" id="communitiesList">
                    {shown.map(item => (
                        <Link
                            key={item.id || item.name}
                            to={`/community.html?name=${encodeURIComponent(item.name)}`}
                            className="community-item"
                            data-community={item.name}
                        >
                            <CommunityIcon community={item} size={32} />
                            <div className="community-info">
                                <span className="community-name">r/{item.name}</span>
                                <span className="community-members">{formatNumber(item.memberCount)} members</span>
                            </div>
                        </Link>
                    ))}
                </div>

                <button
                    type="button"
                    className="see-more-btn"
                    id="seeMoreCommunitiesBtn"
                    onClick={() => {
                        if (!expanded) {
                            setExpanded(true);
                        } else {
                            navigate('/index.html?view=explore');
                        }
                    }}
                >
                    {expanded ? 'Explore all communities' : 'See more'}
                </button>
            </div>
        </div>
    );
}
