import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import AppLayout from '../layout/AppLayout.jsx';
import { CommunityIcon } from '../components/Avatars.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import { formatCount } from '../../js/utils.js';

export default function CommunitiesPage() {
    const { isLoggedIn, openAuthModal, openCommunityModal, isJoined, toggleJoin } = useAuth();

    const [joined, setJoined] = useState([]);
    const [moderated, setModerated] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isLoggedIn) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        api.get('/users/me/communities')
            .then(data => {
                if (cancelled) return;
                setJoined(data.joined || []);
                setModerated(data.moderated || []);
            })
            .catch(err => {
                if (cancelled) return;
                setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [isLoggedIn]);

    const handleJoinClick = async (c) => {
        const res = await toggleJoin(c);
        if (res) {
            setJoined(prev => prev.map(item => (
                item.name === c.name ? { ...item, joined: res.joined, memberCount: res.memberCount } : item
            )));
        }
    };

    if (!isLoggedIn) {
        return (
            <AppLayout rightColumn={false}>
                <div className="rc-empty-state">
                    <h3>Log in to manage your communities</h3>
                    <button
                        type="button"
                        className="ui-btn ui-btn-primary"
                        id="commLoginBtn"
                        onClick={() => openAuthModal('Log In')}
                    >
                        Log In
                    </button>
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

    if (error) {
        return (
            <AppLayout rightColumn={false}>
                <div className="rc-empty-state">
                    <p>{error}</p>
                </div>
            </AppLayout>
        );
    }

    const renderRow = (c, showJoin = true) => {
        const joinedState = isJoined(c.name);
        return (
            <div key={c.name} className="rc-search-row">
                <Link to={`/community.html?name=${encodeURIComponent(c.name)}`}>
                    <CommunityIcon community={c} size={40} />
                </Link>
                <Link className="rc-search-row-info" to={`/community.html?name=${encodeURIComponent(c.name)}`}>
                    <strong>r/{c.name}</strong>
                    <span className="rc-muted-text">{formatCount(c.memberCount)} members • {c.topic}</span>
                    <p>{c.description}</p>
                </Link>
                {showJoin && (
                    <button
                        type="button"
                        className={`btn-community-join ${joinedState ? 'joined' : ''}`}
                        data-join-community={c.name}
                        onClick={() => handleJoinClick(c)}
                    >
                        {joinedState ? 'Joined' : 'Join'}
                    </button>
                )}
            </div>
        );
    };

    return (
        <AppLayout rightColumn={false}>
            <div className="rc-settings-page">
                <h1 className="rc-view-title">Manage Communities</h1>
                <div className="ui-dialog-actions" style={{ justifyContent: 'flex-start', marginBottom: '16px' }}>
                    <button
                        type="button"
                        className="ui-btn ui-btn-primary"
                        id="manageStartCommunity"
                        onClick={openCommunityModal}
                    >
                        ＋ Start a community
                    </button>
                    <Link className="ui-btn ui-btn-secondary" to="/index.html?view=explore">
                        Explore communities
                    </Link>
                </div>

                {moderated.length > 0 && (
                    <>
                        <h2 className="rc-section-heading">Communities you moderate</h2>
                        <div className="rc-search-list">
                            {moderated.map(c => renderRow(c, false))}
                        </div>
                    </>
                )}

                <h2 className="rc-section-heading">Joined ({joined.length})</h2>
                <div className="rc-search-list">
                    {joined.length > 0 ? (
                        joined.map(c => renderRow(c, true))
                    ) : (
                        <p className="rc-muted-text">You haven't joined any communities yet.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
