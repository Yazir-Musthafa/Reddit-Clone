import React, { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../AuthContext.jsx';
import { UserAvatar } from './Avatars.jsx';
import CommentComposer from '../CommentComposer.jsx';
import { timeAgo, formatCount, formatCommentBody, copyToClipboard, absoluteUrl } from '../../js/utils.js';
import { api } from '../../js/api.js';
import { showToast } from '../Toasts.jsx';

const MAX_INDENT = 8;

const ICON = {
    up: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
    down: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
    reply: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
};

export default function CommentItem({
    comment,
    post,
    byParent,
    depth = 0,
    onCommentUpdated,
    onReplyCreated,
    onCommentDeleted
}) {
    const { user, isLoggedIn, requireLogin, confirmDialog, reportDialog } = useAuth();

    const [collapsed, setCollapsed] = useState(false);
    const [replying, setReplying] = useState(false);
    const [editing, setEditing] = useState(false);
    const [score, setScore] = useState(comment.score || 0);
    const [userVote, setUserVote] = useState(comment.userVote || 0);
    const [body, setBody] = useState(comment.body || '');
    const [deleted, setDeleted] = useState(!!comment.deleted);
    const [edited, setEdited] = useState(!!comment.edited);

    const isAuthor = !deleted && user?.username === comment.author?.username;
    const isOp = !deleted && post?.author?.username === comment.author?.username;
    const modMode = user?.prefs?.modMode !== false;
    const canModerate = post?.community?.isMod || comment.canModerate;
    const canDelete = isAuthor || (canModerate && modMode && !deleted);

    const children = (byParent && byParent.get(comment.id)) || comment.replies || [];

    const countDescendants = (pid) => {
        if (!byParent) return 0;
        const kids = byParent.get(pid) || [];
        return kids.reduce((n, k) => n + 1 + countDescendants(k.id), 0);
    };

    const descendantsCount = countDescendants(comment.id);

    const handleVote = async (dir) => {
        if (!requireLogin()) return;
        const nextVote = userVote === dir ? 0 : dir;
        const prevVote = userVote;
        const prevScore = score;

        setUserVote(nextVote);
        setScore(prev => prev + nextVote - prevVote);

        try {
            const res = await api.post(`/comments/${comment.id}/vote`, { dir: nextVote });
            setScore(res.score);
            setUserVote(res.userVote);
        } catch (err) {
            setScore(prevScore);
            setUserVote(prevVote);
            showToast(err.message);
        }
    };

    const handleEditSubmit = async (newText) => {
        try {
            const { comment: updated } = await api.patch(`/comments/${comment.id}`, { body: newText });
            setBody(updated.body);
            setEdited(true);
            setEditing(false);
            showToast('Comment updated');
            if (onCommentUpdated) onCommentUpdated(updated);
        } catch (err) {
            showToast(err.message);
        }
    };

    const handleDelete = async () => {
        const asMod = !isAuthor;
        const confirmed = await confirmDialog(
            asMod ? 'Remove this comment?' : 'Once you delete this comment, it cannot be restored.',
            {
                title: asMod ? 'Remove comment?' : 'Delete comment?',
                confirmLabel: asMod ? 'Remove' : 'Delete',
                danger: true
            }
        );
        if (!confirmed) return;

        try {
            await api.del(`/comments/${comment.id}`);
            setDeleted(true);
            setBody('[This comment was deleted]');
            showToast(asMod ? 'Comment removed' : 'Comment deleted');
            if (onCommentDeleted) onCommentDeleted(comment.id);
        } catch (err) {
            showToast(err.message);
        }
    };

    const handleShare = async () => {
        const commentUrl = `post.html?id=${encodeURIComponent(post?.id || '')}#comment-${comment.id}`;
        const ok = await copyToClipboard(absoluteUrl(commentUrl));
        showToast(ok ? 'Comment link copied!' : "Couldn't copy the link");
    };

    const handleReplySubmit = async (replyText) => {
        try {
            const { comment: created } = await api.post(`/posts/${post.id}/comments`, {
                parentId: comment.id,
                body: replyText
            });
            setReplying(false);
            showToast('Reply posted');
            if (onReplyCreated) onReplyCreated(created, comment.id);
        } catch (err) {
            showToast(err.message);
        }
    };

    const toggleCollapse = () => setCollapsed(prev => !prev);

    const voteCls = userVote === 1 ? 'voted-up' : userVote === -1 ? 'voted-down' : '';

    return (
        <div
            className={`rc-comment ${depth >= MAX_INDENT ? 'rc-comment-flat' : ''}${collapsed ? ' collapsed' : ''}`}
            id={`comment-${comment.id}`}
            data-id={comment.id}
        >
            <button
                type="button"
                className="rc-comment-rail"
                data-action="collapse"
                aria-label="Collapse thread"
                onClick={toggleCollapse}
            />

            <div className="rc-comment-main">
                <div className="rc-comment-meta">
                    <button
                        type="button"
                        className="rc-collapse-toggle"
                        data-action="collapse"
                        aria-label="Toggle thread"
                        onClick={toggleCollapse}
                    >
                        {collapsed ? '⊕' : '⊖'}
                    </button>

                    {deleted ? (
                        <span className="rc-muted-text">[deleted]</span>
                    ) : (
                        <>
                            <UserAvatar user={comment.author} size={22} />
                            <Link to={`/user.html?u=${encodeURIComponent(comment.author?.username || '')}`} className="rc-comment-author">
                                {comment.author?.username}
                            </Link>
                            {isOp && <span className="rc-op-badge">OP</span>}
                        </>
                    )}

                    <span className="post-dot-separator">•</span>
                    <span className="rc-muted-text" title={new Date(comment.createdAt).toLocaleString()}>
                        {timeAgo(comment.createdAt)}
                    </span>
                    {edited && <span className="rc-muted-text">• edited</span>}
                    {collapsed && descendantsCount > 0 && (
                        <span className="rc-collapsed-count">({descendantsCount} more)</span>
                    )}
                </div>

                {!collapsed && (
                    <div className="rc-comment-content">
                        {editing ? (
                            <div className="rc-comment-composer-wrap" style={{ marginTop: '8px' }}>
                                <CommentComposer
                                    initialValue={body}
                                    placeholder="Edit your comment"
                                    submitLabel="Save"
                                    onCancel={() => setEditing(false)}
                                    onSubmit={handleEditSubmit}
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div className="rc-comment-body">
                                {deleted ? (
                                    <em className="rc-muted-text">This comment was deleted.</em>
                                ) : (
                                    <span dangerouslySetInnerHTML={{ __html: formatCommentBody(body) }} />
                                )}
                            </div>
                        )}

                        {!deleted && (
                            <div className="rc-comment-actions">
                                <div className={`rc-comment-vote vote-pill ${voteCls}`}>
                                    <button
                                        type="button"
                                        className="vote-btn vote-up"
                                        data-action="upvote"
                                        aria-label="Upvote"
                                        aria-pressed={userVote === 1}
                                        onClick={() => handleVote(1)}
                                    >
                                        {ICON.up}
                                    </button>
                                    <span className="vote-count">{formatCount(score)}</span>
                                    <button
                                        type="button"
                                        className="vote-btn vote-down"
                                        data-action="downvote"
                                        aria-label="Downvote"
                                        aria-pressed={userVote === -1}
                                        onClick={() => handleVote(-1)}
                                    >
                                        {ICON.down}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="rc-comment-action"
                                    data-action="reply"
                                    onClick={() => {
                                        if (requireLogin()) setReplying(prev => !prev);
                                    }}
                                >
                                    {ICON.reply}
                                    <span>Reply</span>
                                </button>

                                <button
                                    type="button"
                                    className="rc-comment-action"
                                    data-action="share"
                                    onClick={handleShare}
                                >
                                    Share
                                </button>

                                {isAuthor && (
                                    <button
                                        type="button"
                                        className="rc-comment-action"
                                        data-action="edit"
                                        onClick={() => setEditing(prev => !prev)}
                                    >
                                        Edit
                                    </button>
                                )}

                                {canDelete && (
                                    <button
                                        type="button"
                                        className="rc-comment-action rc-danger"
                                        data-action="delete"
                                        onClick={handleDelete}
                                    >
                                        {isAuthor ? 'Delete' : 'Remove'}
                                    </button>
                                )}

                                {!isAuthor && isLoggedIn && (
                                    <button
                                        type="button"
                                        className="rc-comment-action"
                                        data-action="report"
                                        onClick={() => reportDialog('Comment', comment.id)}
                                    >
                                        Report
                                    </button>
                                )}
                            </div>
                        )}

                        {replying && (
                            <div className="rc-reply-slot" style={{ marginTop: '12px' }}>
                                <CommentComposer
                                    placeholder={`Reply to u/${comment.author?.username}`}
                                    submitLabel="Reply"
                                    onCancel={() => setReplying(false)}
                                    onSubmit={handleReplySubmit}
                                    autoFocus
                                />
                            </div>
                        )}

                        {children.length > 0 && (
                            <div className="rc-comment-children">
                                {children.map(child => (
                                    <CommentItem
                                        key={child.id}
                                        comment={child}
                                        post={post}
                                        byParent={byParent}
                                        depth={depth + 1}
                                        onCommentUpdated={onCommentUpdated}
                                        onReplyCreated={onReplyCreated}
                                        onCommentDeleted={onCommentDeleted}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
