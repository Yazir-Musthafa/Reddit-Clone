import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router';
import AppLayout from '../layout/AppLayout.jsx';
import Feed from '../Feed.jsx';
import { CommunityIcon } from '../components/Avatars.jsx';
import { AboutCommunityCard, RulesCard, ModeratorsCard } from '../components/CommunityWidgets.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import { showToast } from '../Toasts.jsx';
import { formatNumber } from '../../js/utils.js';

export default function CommunityPage() {
    const [searchParams] = useSearchParams();
    const params = useParams();
    const { user, isJoined, toggleJoin, openCommunityModal, formDialog, openDialog } = useAuth();

    const name = params.name || searchParams.get('name') || '';
    const openModToolsRequested = searchParams.get('modtools') === '1' || searchParams.get('modtools') === 'true';

    const [community, setCommunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [matureAck, setMatureAck] = useState(() => {
        try {
            return !!sessionStorage.getItem(`rc_mature_ok_${name}`);
        } catch {
            return false;
        }
    });

    useEffect(() => {
        if (!name) {
            setError('Community name required');
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        api.get(`/communities/${encodeURIComponent(name)}`)
            .then(({ community: fetched }) => {
                if (cancelled) return;
                setCommunity(fetched);
                document.title = `r/${fetched.name}`;
            })
            .catch(err => {
                if (cancelled) return;
                setError(err.message || 'Community not found');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [name]);

    useEffect(() => {
        if (openModToolsRequested && community?.isMod) {
            openSettingsDialog();
        }
    }, [openModToolsRequested, community?.isMod]);

    const handleJoinClick = async () => {
        if (!community) return;
        const res = await toggleJoin(community);
        if (res) {
            setCommunity(prev => ({
                ...prev,
                memberCount: res.memberCount !== undefined ? res.memberCount : prev.memberCount
            }));
        }
    };

    const handleMatureContinue = () => {
        try {
            sessionStorage.setItem(`rc_mature_ok_${community.name}`, '1');
        } catch { /* ignore */ }
        setMatureAck(true);
    };

    // Mod settings dialog
    const openSettingsDialog = async () => {
        if (!community) return;
        let topics = [];
        try {
            ({ topics } = await api.get('/communities/topics'));
        } catch {
            topics = [community.topic];
        }

        const rulesText = (community.rules || []).map(r => (r.description ? `${r.title} | ${r.description}` : r.title)).join('\n');

        const updated = await formDialog({
            title: 'Community settings',
            wide: true,
            submitLabel: 'Save changes',
            fields: [
                { name: 'description', label: 'Description', type: 'textarea', rows: 3, value: community.description, maxlength: 500 },
                { name: 'icon', label: 'Icon (emoji or up to 4 letters)', value: community.icon, maxlength: 4 },
                { name: 'color', label: 'Icon color', type: 'color', value: community.color },
                { name: 'bannerColor', label: 'Banner color', type: 'color', value: community.bannerColor },
                { name: 'topic', label: 'Topic', type: 'select', value: community.topic, options: topics.map(t => ({ value: t, label: t })) },
                {
                    name: 'type', label: 'Community type', type: 'select', value: community.type,
                    options: [
                        { value: 'Public', label: 'Public: anyone can view, post and comment' },
                        { value: 'Restricted', label: 'Restricted: anyone can view, only approved users post' },
                        { value: 'Private', label: 'Private: only approved users can view and post' }
                    ]
                },
                { name: 'mature', label: 'Mature (18+)', type: 'select', value: community.mature ? 'yes' : 'no', options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }] },
                { name: 'rules', label: 'Rules (one per line, optionally "Title | description")', type: 'textarea', rows: 5, value: rulesText }
            ],
            onSubmit: async (values) => {
                const rules = (values.rules || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
                    const [title, ...rest] = line.split('|');
                    return { title: title.trim(), description: rest.join('|').trim() };
                });
                const { community: saved } = await api.patch(`/communities/${encodeURIComponent(community.name)}`, {
                    description: values.description,
                    icon: values.icon,
                    color: (values.color || '').toUpperCase(),
                    bannerColor: (values.bannerColor || '').toUpperCase(),
                    topic: values.topic,
                    type: values.type,
                    mature: values.mature === 'yes',
                    rules
                });
                return saved;
            }
        });

        if (updated) {
            setCommunity(updated);
            showToast('Community settings saved');
        }
    };

    // Mod users dialog
    const openUsersDialog = async () => {
        if (!community) return;
        const commName = community.name;

        openDialog({
            title: 'Approved users & moderators',
            wide: true,
            render: (close) => <ModUsersContent communityName={commName} close={close} onCommunityChanged={setCommunity} />
        });
    };

    const openModMenu = () => {
        openDialog({
            title: 'Mod Tools',
            subtitle: `Manage r/${community.name}`,
            render: (close) => (
                <div className="rc-mod-menu" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0' }}>
                    <button
                        type="button"
                        className="reddit-auth-pill-btn"
                        data-tool="settings"
                        onClick={() => { close(); openSettingsDialog(); }}
                    >
                        ⚙️ Community settings &amp; rules
                    </button>
                    <button
                        type="button"
                        className="reddit-auth-pill-btn"
                        data-tool="users"
                        onClick={() => { close(); openUsersDialog(); }}
                    >
                        👥 Approved users &amp; moderators
                    </button>
                </div>
            )
        });
    };

    if (loading) {
        return (
            <AppLayout rightColumn={false}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                    <div className="rc-spinner" />
                </div>
            </AppLayout>
        );
    }

    if (error || !community) {
        return (
            <AppLayout rightColumn={false}>
                <div className="rc-empty-state">
                    <h3>Sorry, there aren't any communities on Reddit with that name.</h3>
                    <p>{error}</p>
                    <div className="ui-dialog-actions" style={{ justifyContent: 'center' }}>
                        <Link className="ui-btn ui-btn-secondary" to="/index.html?view=explore">Explore communities</Link>
                        {user && (
                            <button
                                type="button"
                                className="ui-btn ui-btn-primary"
                                id="createMissingCommunity"
                                onClick={openCommunityModal}
                            >
                                Create community
                            </button>
                        )}
                    </div>
                </div>
            </AppLayout>
        );
    }

    const joined = isJoined(community.name);
    const showMatureWarning = community.mature && !user?.prefs?.showMature && !matureAck;

    return (
        <AppLayout rightColumn={false}>
            <div className="rc-community-page">
                <div
                    className="rc-community-banner no-invert"
                    style={{ backgroundColor: community.bannerColor }}
                />

                <div className="rc-community-header">
                    <div className="rc-community-avatar">
                        <CommunityIcon community={community} size={88} />
                    </div>
                    <div className="rc-community-title">
                        <h1>r/{community.name}</h1>
                        <span className="rc-muted-text">
                            {formatNumber(community.memberCount)} members • {community.type}{community.mature ? ' • 18+' : ''}
                        </span>
                    </div>
                    <div className="rc-community-actions">
                        {community.canPost && (
                            <Link
                                className="ui-btn ui-btn-secondary"
                                to={`/submit.html?community=${encodeURIComponent(community.name)}`}
                            >
                                ＋ Create Post
                            </Link>
                        )}
                        {community.isMod && (
                            <button
                                type="button"
                                className="ui-btn ui-btn-secondary"
                                id="modToolsBtn"
                                onClick={openModMenu}
                            >
                                🛡️ Mod Tools
                            </button>
                        )}
                        <button
                            type="button"
                            className={`ui-btn ${joined ? 'ui-btn-secondary joined' : 'ui-btn-primary'}`}
                            id="communityJoinBtn"
                            data-join-community={community.name}
                            onClick={handleJoinClick}
                        >
                            {joined ? 'Joined' : 'Join'}
                        </button>
                    </div>
                </div>

                <div className="rc-page-grid">
                    <div className="rc-page-main" id="communityFeed">
                        {!community.canView ? (
                            <div className="rc-empty-state">
                                <h3>🔒 r/{community.name} is private</h3>
                                <p>Only approved members can view and contribute. Message the moderators to ask for access.</p>
                            </div>
                        ) : showMatureWarning ? (
                            <div className="rc-empty-state">
                                <h3>r/{community.name} is an 18+ community</h3>
                                <p>You must be at least 18 to view this community.</p>
                                <button
                                    type="button"
                                    className="ui-btn ui-btn-primary"
                                    id="matureContinueBtn"
                                    onClick={handleMatureContinue}
                                >
                                    I'm over 18, continue
                                </button>
                            </div>
                        ) : (
                            <Feed
                                key={community.name}
                                endpoint={({ sort, t, page }) => (
                                    `/posts?community=${encodeURIComponent(community.name)}&sort=${sort}&t=${t}&page=${page}`
                                )}
                                sorts={['best', 'hot', 'new', 'top', 'rising']}
                                defaultSort="hot"
                                showCommunity={false}
                                emptyHtml={
                                    <div className="rc-empty-state">
                                        <h3>This community doesn't have any posts yet</h3>
                                        <p>Make one and get this feed started.</p>
                                        {community.canPost && (
                                            <Link
                                                className="ui-btn ui-btn-primary"
                                                to={`/submit.html?community=${encodeURIComponent(community.name)}`}
                                            >
                                                Create Post
                                            </Link>
                                        )}
                                    </div>
                                }
                            />
                        )}
                    </div>

                    <aside className="rc-page-aside" id="communityAside">
                        <AboutCommunityCard community={community} showHeader={false} />
                        <RulesCard community={community} />
                        <ModeratorsCard community={community} />
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}

function ModUsersContent({ communityName, close, onCommunityChanged }) {
    const [community, setCommunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [addUsername, setAddUsername] = useState('');
    const [role, setRole] = useState('approved');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = () => {
        api.get(`/communities/${encodeURIComponent(communityName)}`)
            .then(({ community: fetched }) => {
                setCommunity(fetched);
                if (onCommunityChanged) onCommunityChanged(fetched);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, [communityName]);

    const handleRemoveApproved = async (username) => {
        try {
            await api.del(`/communities/${encodeURIComponent(communityName)}/members/${encodeURIComponent(username)}`);
            showToast(`Removed u/${username}`);
            load();
        } catch (err) {
            showToast(err.message);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!addUsername.trim()) return;
        setError('');
        setSubmitting(true);
        try {
            await api.post(`/communities/${encodeURIComponent(communityName)}/members`, {
                username: addUsername.trim(),
                role
            });
            showToast(`Added u/${addUsername.trim()}`);
            setAddUsername('');
            load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="rc-spinner" />;

    return (
        <div>
            <div id="modUsersList">
                <h3 className="ui-field-label">Moderators</h3>
                <ul className="rc-user-chip-list">
                    {(community?.moderators || []).map(m => (
                        <li key={m.username}>
                            <Link to={`/user.html?u=${encodeURIComponent(m.username)}`}>u/{m.username}</Link>
                        </li>
                    ))}
                </ul>

                <h3 className="ui-field-label" style={{ marginTop: '16px' }}>Approved users</h3>
                <p className="ui-muted">Approved users can post in restricted communities and view private ones.</p>
                <ul className="rc-user-chip-list">
                    {(community?.approvedUsers || []).length > 0 ? (
                        community.approvedUsers.map(u => (
                            <li key={u}>
                                u/{u}{' '}
                                <button
                                    type="button"
                                    className="rc-link-btn"
                                    data-remove={u}
                                    onClick={() => handleRemoveApproved(u)}
                                >
                                    Remove
                                </button>
                            </li>
                        ))
                    ) : (
                        <li className="ui-muted">None yet</li>
                    )}
                </ul>
            </div>

            <form className="ui-form" id="modUsersForm" onSubmit={handleAddUser} style={{ marginTop: '20px' }}>
                <label className="ui-field-label" htmlFor="modUsername">Add a user</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        type="text"
                        className="ui-input"
                        id="modUsername"
                        placeholder="Reddit username"
                        value={addUsername}
                        onChange={e => setAddUsername(e.target.value)}
                        required
                    />
                    <select
                        className="ui-input"
                        id="modRole"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        style={{ width: '140px' }}
                    >
                        <option value="approved">Approved user</option>
                        <option value="moderator">Moderator</option>
                    </select>
                    <button
                        type="submit"
                        className="ui-btn ui-btn-primary"
                        disabled={submitting}
                    >
                        {submitting ? 'Adding…' : 'Add'}
                    </button>
                </div>
                {error && <p className="ui-error" style={{ marginTop: '8px' }}>{error}</p>}
            </form>
        </div>
    );
}
