import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router';
import AppLayout from '../layout/AppLayout.jsx';
import PostCard from '../PostCard.jsx';
import CommentComposer from '../CommentComposer.jsx';
import CommentItem from '../components/CommentItem.jsx';
import { AboutCommunityCard, RulesCard, ModeratorsCard } from '../components/CommunityWidgets.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import { showToast } from '../Toasts.jsx';
import { formatCount, rememberRecentPost } from '../../js/utils.js';

const BACK_ICON = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);

export default function PostPage() {
    const [searchParams] = useSearchParams();
    const params = useParams();
    const navigate = useNavigate();
    const { isLoggedIn, openAuthModal } = useAuth();

    const postId = params.id || searchParams.get('id');
    const editRequested = searchParams.get('edit') === '1' || searchParams.get('edit') === 'true';

    const [post, setPost] = useState(null);
    const [community, setCommunity] = useState(null);
    const [comments, setComments] = useState([]);
    const [sort, setSort] = useState('best');
    const [loadingPost, setLoadingPost] = useState(true);
    const [loadingComments, setLoadingComments] = useState(true);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(false);
    const [editBody, setEditBody] = useState('');

    const editorRef = useRef(null);

    // Fetch post
    useEffect(() => {
        if (!postId) {
            setError({ status: 404, message: 'Post not found' });
            setLoadingPost(false);
            return;
        }

        let cancelled = false;
        setLoadingPost(true);
        setError(null);

        api.get(`/posts/${encodeURIComponent(postId)}`)
            .then(({ post: fetchedPost }) => {
                if (cancelled) return;
                setPost(fetchedPost);
                setEditBody(fetchedPost.body || '');
                document.title = `${fetchedPost.title} : r/${fetchedPost.community.name}`;
                rememberRecentPost(fetchedPost);

                if (editRequested && fetchedPost.isAuthor) {
                    setEditing(true);
                }

                // Fetch community full info for sidebar
                api.get(`/communities/${encodeURIComponent(fetchedPost.community.name)}`)
                    .then(({ community: fetchedComm }) => {
                        if (!cancelled) setCommunity(fetchedComm);
                    })
                    .catch(() => {});
            })
            .catch(err => {
                if (cancelled) return;
                setError(err);
            })
            .finally(() => {
                if (!cancelled) setLoadingPost(false);
            });

        return () => { cancelled = true; };
    }, [postId, editRequested]);

    // Fetch comments
    useEffect(() => {
        if (!post?.id) return;
        let cancelled = false;
        setLoadingComments(true);

        api.get(`/posts/${encodeURIComponent(post.id)}/comments?sort=${sort}`)
            .then(({ comments: fetchedComments }) => {
                if (cancelled) return;
                setComments(fetchedComments || []);
            })
            .catch(err => {
                if (cancelled) return;
                showToast(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoadingComments(false);
            });

        return () => { cancelled = true; };
    }, [post?.id, sort]);

    // Scroll to hash comment
    useEffect(() => {
        if (!loadingComments && window.location.hash) {
            const el = document.querySelector(window.location.hash);
            if (el) {
                setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        }
    }, [loadingComments]);

    // Tree indexing
    const byParent = useMemo(() => {
        const map = new Map();
        comments.forEach(c => {
            const key = c.parent || 'root';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(c);
        });
        return map;
    }, [comments]);

    const handleBack = () => {
        if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
            window.history.back();
        } else {
            navigate('/index.html');
        }
    };

    const handleNewComment = async (body) => {
        const { comment } = await api.post(`/posts/${post.id}/comments`, { body });
        setComments(prev => [comment, ...prev]);
        setPost(prev => ({ ...prev, commentCount: (prev.commentCount || 0) + 1 }));
        showToast('Comment posted');
    };

    const handleReplyCreated = (created) => {
        setComments(prev => [...prev, created]);
        setPost(prev => ({ ...prev, commentCount: (prev.commentCount || 0) + 1 }));
    };

    const handleCommentUpdated = (updated) => {
        setComments(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    };

    const handleCommentDeleted = (deletedId) => {
        setComments(prev => prev.map(c => c.id === deletedId ? { ...c, deleted: true } : c));
    };

    const handleSavePostEdit = async () => {
        const bodyContent = editorRef.current ? editorRef.current.innerHTML : editBody;
        try {
            const { post: updated } = await api.patch(`/posts/${post.id}`, { body: bodyContent });
            setPost(prev => ({ ...prev, body: updated.body, edited: updated.edited }));
            setEditing(false);
            showToast('Post updated');
        } catch (err) {
            showToast(err.message);
        }
    };

    const rightColumnContent = community ? (
        <aside className="rc-page-aside">
            <AboutCommunityCard community={community} />
            <RulesCard community={community} />
            <ModeratorsCard community={community} />
        </aside>
    ) : null;

    if (loadingPost) {
        return (
            <AppLayout rightColumn={true} rightColumnContent={rightColumnContent}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                    <div className="rc-spinner" />
                </div>
            </AppLayout>
        );
    }

    if (error || !post) {
        const title = error?.status === 410 ? 'This post was deleted'
            : error?.status === 403 ? 'This community is private'
            : 'Post not found';
        return (
            <AppLayout rightColumn={true}>
                <div className="rc-empty-state">
                    <h3>{title}</h3>
                    {error?.message && <p>{error.message}</p>}
                    <Link className="ui-btn ui-btn-primary" to="/index.html">Go home</Link>
                </div>
            </AppLayout>
        );
    }

    const rootComments = byParent.get('root') || [];

    return (
        <AppLayout rightColumn={true} rightColumnContent={rightColumnContent}>
            <div className="rc-post-page">
                <button
                    type="button"
                    className="rc-back-btn"
                    id="postBackBtn"
                    aria-label="Go back"
                    onClick={handleBack}
                >
                    {BACK_ICON}
                </button>

                <div id="postSlot">
                    {editing ? (
                        <div className="post-card">
                            <h2 className="rc-post-title">{post.title}</h2>
                            <div className="rc-edit-box">
                                <div
                                    ref={editorRef}
                                    className="post-body-editor rc-edit-editor"
                                    contentEditable={true}
                                    data-placeholder="Body text (optional)"
                                    dangerouslySetInnerHTML={{ __html: post.body || '' }}
                                    suppressContentEditableWarning={true}
                                />
                                <div className="ui-dialog-actions">
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn-secondary"
                                        data-cancel
                                        onClick={() => setEditing(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn-primary"
                                        data-save
                                        onClick={handleSavePostEdit}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <PostCard
                            post={post}
                            detail={true}
                            onChange={changes => setPost(prev => ({ ...prev, ...changes }))}
                            onEdit={() => setEditing(true)}
                            onDeleted={() => {
                                showToast('Post deleted');
                                navigate(`/community.html?name=${encodeURIComponent(post.community.name)}`);
                            }}
                        />
                    )}
                </div>

                <section className="rc-comments-section" id="comments">
                    <div id="commentComposerSlot">
                        {isLoggedIn ? (
                            <CommentComposer
                                resetOnSuccess={true}
                                onSubmit={handleNewComment}
                            />
                        ) : (
                            <button
                                type="button"
                                className="rc-comment-login"
                                id="commentLoginBtn"
                                onClick={() => openAuthModal('Log In')}
                            >
                                Log in to join the conversation
                            </button>
                        )}
                    </div>

                    <div className="rc-comments-toolbar">
                        <label htmlFor="commentSortSelect">Sort by:</label>
                        <select
                            id="commentSortSelect"
                            className="rc-inline-select"
                            value={sort}
                            onChange={e => setSort(e.target.value)}
                        >
                            <option value="best">Best</option>
                            <option value="top">Top</option>
                            <option value="new">New</option>
                            <option value="old">Old</option>
                        </select>
                        <span className="rc-muted-text" id="commentCountLabel">
                            {formatCount(post.commentCount || 0)} comment{post.commentCount === 1 ? '' : 's'}
                        </span>
                    </div>

                    <div id="commentTree">
                        {loadingComments ? (
                            <div className="rc-spinner" />
                        ) : rootComments.length === 0 ? (
                            <p className="rc-muted-text" style={{ padding: '24px 0', textAlign: 'center' }}>
                                No comments yet. Be the first to share what you think!
                            </p>
                        ) : (
                            rootComments.map(c => (
                                <CommentItem
                                    key={c.id}
                                    comment={c}
                                    post={post}
                                    byParent={byParent}
                                    depth={0}
                                    onCommentUpdated={handleCommentUpdated}
                                    onReplyCreated={handleReplyCreated}
                                    onCommentDeleted={handleCommentDeleted}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
