import React from 'react';
import { Link } from 'react-router';
import { useAuth } from '../AuthContext.jsx';
import { CommunityIcon, UserAvatar } from './Avatars.jsx';
import { formatDate, formatNumber } from '../../js/utils.js';
import { showToast } from '../Toasts.jsx';

const TYPE_ICONS = { Public: '🌐', Restricted: '👁️', Private: '🔒' };

export function AboutCommunityCard({ community, showHeader = true }) {
    const { isJoined, toggleJoin } = useAuth();
    if (!community) return null;
    const joined = isJoined(community.name);

    return (
        <div className="rc-side-card">
            {showHeader && (
                <div
                    className="rc-side-card-banner no-invert"
                    style={{ backgroundColor: community.bannerColor || '#FF4500' }}
                />
            )}
            <div className="rc-side-card-body">
                {showHeader ? (
                    <Link className="rc-side-title" to={`/community.html?name=${encodeURIComponent(community.name)}`}>
                        <CommunityIcon community={community} size={36} />
                        <span>r/{community.name}</span>
                    </Link>
                ) : (
                    <h3 className="rc-side-heading">About community</h3>
                )}
                <p className="rc-side-desc">{community.description}</p>
                <div className="rc-side-meta">
                    <span>🎂 Created {formatDate(community.createdAt)}</span>
                    <span>
                        {TYPE_ICONS[community.type] || '🌐'} {community.type}
                        {community.mature ? ' • 18+' : ''}
                    </span>
                    <span>🏷️ {community.topic}</span>
                </div>
                <div className="rc-side-stats">
                    <div>
                        <strong>{formatNumber(community.memberCount)}</strong>
                        <span>Members</span>
                    </div>
                    {community.weeklyPosts !== undefined && (
                        <div>
                            <strong>{formatNumber(community.weeklyPosts)}</strong>
                            <span>Posts this week</span>
                        </div>
                    )}
                </div>
                <div className="rc-side-actions">
                    {showHeader && (
                        <button
                            type="button"
                            className={`ui-btn ${joined ? 'ui-btn-secondary joined' : 'ui-btn-primary'}`}
                            data-join-community={community.name}
                            data-side-join=""
                            onClick={() => toggleJoin(community)}
                        >
                            {joined ? 'Joined' : 'Join'}
                        </button>
                    )}
                    {community.canPost !== false && (
                        <Link className="ui-btn ui-btn-secondary" to={`/submit.html?community=${encodeURIComponent(community.name)}`}>
                            Create Post
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

export function RulesCard({ community }) {
    if (!community?.rules?.length) return null;

    return (
        <div className="rc-side-card">
            <div className="rc-side-card-body">
                <h3 className="rc-side-heading">r/{community.name} Rules</h3>
                <ol className="rc-rules-list">
                    {community.rules.map((r, i) => (
                        <li key={i}>
                            <details>
                                <summary>
                                    <span className="rc-rule-num">{i + 1}</span>
                                    {r.title}
                                </summary>
                                {r.description && <p>{r.description}</p>}
                            </details>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

export function ModeratorsCard({ community }) {
    const { user, openChatWith, requireLogin } = useAuth();
    if (!community?.moderators?.length) return null;

    const handleMessageMods = () => {
        if (!requireLogin()) return;
        const mod = community.moderators.find(m => m.username !== user?.username);
        if (!mod) {
            showToast("You're the only moderator here");
            return;
        }
        openChatWith(mod.username);
    };

    return (
        <div className="rc-side-card">
            <div className="rc-side-card-body">
                <h3 className="rc-side-heading">Moderators</h3>
                <div className="rc-mod-list">
                    {community.moderators.map(m => (
                        <Link
                            key={m.username}
                            className="rc-mod-item"
                            to={`/user.html?u=${encodeURIComponent(m.username)}`}
                        >
                            <UserAvatar user={m} size={24} />
                            <span>u/{m.username}</span>
                        </Link>
                    ))}
                </div>
                <button
                    type="button"
                    className="ui-btn ui-btn-secondary rc-full-width"
                    data-message-mods=""
                    onClick={handleMessageMods}
                >
                    Message the mods
                </button>
            </div>
        </div>
    );
}
