import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import AppLayout from '../layout/AppLayout.jsx';
import Feed from '../Feed.jsx';
import ExploreView from '../components/ExploreView.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import { showToast } from '../Toasts.jsx';

export default function HomePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isLoggedIn, setUser, confirmDialog, formDialog } = useAuth();

    const view = searchParams.get('view') || 'home';
    const feedId = searchParams.get('feed') || '';

    const [customFeed, setCustomFeed] = useState(null);

    useEffect(() => {
        if (view === 'custom' && feedId) {
            const found = (user?.customFeeds || []).find(f => f.id === feedId);
            setCustomFeed(found || null);
        } else {
            setCustomFeed(null);
        }
    }, [view, feedId, user]);

    useEffect(() => {
        document.title = view === 'popular' ? 'Popular - Reddit'
            : view === 'news' ? 'News - Reddit'
            : view === 'all' ? 'All - Reddit'
            : view === 'explore' ? 'Explore Communities - Reddit'
            : view === 'custom' && customFeed ? `${customFeed.name} - Reddit`
            : 'Reddit - The heart of the internet';
    }, [view, customFeed]);

    const handleEditCustomFeed = async () => {
        if (!customFeed) return;
        const selected = new Set((customFeed.communities || []).map(c => c.name.toLowerCase()));
        const options = (user?.joinedCommunities || []).map(c => ({
            value: c.name,
            label: `r/${c.name}`,
            checked: selected.has(c.name.toLowerCase())
        }));

        const result = await formDialog({
            title: 'Edit custom feed',
            subtitle: 'Combine communities you like into one feed.',
            submitLabel: 'Save',
            fields: [
                { name: 'name', label: 'Name', value: customFeed.name, maxlength: 50, placeholder: 'e.g. Weekend reads' },
                { name: 'description', label: 'Description (optional)', type: 'textarea', rows: 2, value: customFeed.description || '', maxlength: 300 },
                { name: 'communities', label: 'Communities', type: 'checkboxes', options }
            ],
            onSubmit: async (values) => {
                if (!values.name?.trim()) throw new Error('Give your custom feed a name');
                const { user: updated } = await api.patch(`/users/me/feeds/${customFeed.id}`, values);
                setUser(updated);
                return customFeed.id;
            }
        });

        if (result) {
            showToast('Custom feed updated');
        }
    };

    const handleDeleteCustomFeed = async () => {
        if (!customFeed) return;
        const confirmed = await confirmDialog(`Delete the custom feed "${customFeed.name}"?`, {
            title: 'Delete custom feed?',
            confirmLabel: 'Delete',
            danger: true
        });
        if (!confirmed) return;

        try {
            const { user: updated } = await api.del(`/users/me/feeds/${customFeed.id}`);
            setUser(updated);
            showToast('Custom feed deleted');
            navigate('/index.html?view=home');
        } catch (err) {
            showToast(err.message);
        }
    };

    if (view === 'explore') {
        return (
            <AppLayout rightColumn={false}>
                <ExploreView />
            </AppLayout>
        );
    }

    const feedParam = view === 'home' && isLoggedIn ? 'home' : view === 'popular' ? 'popular' : view === 'news' ? 'news' : 'all';

    const endpoint = ({ sort, t, page }) => {
        if (view === 'custom') {
            return `/posts?feed=custom&feedId=${encodeURIComponent(feedId)}&sort=${sort}&t=${t}&page=${page}`;
        }
        return `/posts?feed=${feedParam}&sort=${sort}&t=${t}&page=${page}`;
    };

    let headerContent = null;
    if (view === 'custom' && customFeed) {
        headerContent = (
            <div className="rc-feed-header">
                <div className="rc-feed-header-icon">✨</div>
                <div className="rc-feed-header-info">
                    <h1>{customFeed.name}</h1>
                    {customFeed.description && <p className="rc-muted-text">{customFeed.description}</p>}
                    <div className="rc-feed-communities">
                        {(customFeed.communities || []).map(c => (
                            <span key={c.name} className="rc-comm-chip">r/{c.name}</span>
                        ))}
                    </div>
                </div>
                <div className="rc-feed-header-actions">
                    <button type="button" className="ui-btn ui-btn-secondary" id="editCustomFeedBtn" onClick={handleEditCustomFeed}>
                        Edit
                    </button>
                    <button type="button" className="ui-btn ui-btn-danger" id="deleteCustomFeedBtn" onClick={handleDeleteCustomFeed}>
                        Delete
                    </button>
                </div>
            </div>
        );
    } else if (view === 'popular') {
        headerContent = <h1 className="rc-view-title">Popular</h1>;
    } else if (view === 'all') {
        headerContent = <h1 className="rc-view-title">All</h1>;
    } else if (view === 'news') {
        headerContent = <h1 className="rc-view-title">News</h1>;
    }

    const hasRightColumn = view !== 'news';
    const showRecent = view === 'popular';

    return (
        <AppLayout rightColumn={hasRightColumn} showRecent={showRecent}>
            <div>
                {headerContent}
                <Feed
                    key={`${view}:${feedId}`}
                    endpoint={endpoint}
                    defaultSort={view === 'popular' ? 'hot' : 'best'}
                    className={view === 'news' ? 'news-feed-view' : ''}
                />
            </div>
        </AppLayout>
    );
}
