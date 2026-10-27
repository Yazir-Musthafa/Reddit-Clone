import React, { useEffect, useRef } from 'react';
import { POST_ICONS, postUrl } from '../components/post/post.js';
import { timeAgo, formatCount, communityIcon, userAvatar, domainOf } from '../js/utils.js';
import { Markup } from './render.jsx';
import { useAuth } from './AuthContext.jsx';

const communityUrl = name => `community.html?name=${encodeURIComponent(name)}`;
const userUrl = name => `user.html?u=${encodeURIComponent(name)}`;
const isSensitive = post => post.tags.includes('NSFW') || post.tags.includes('Spoiler');
export const PostIcon = ({ name }) => <Markup html={POST_ICONS[name]} />;

export function VoteControls({ post, compact = false }) {
    const active = post.userVote === 1 ? 'voted-up' : post.userVote === -1 ? 'voted-down' : '';
    return <div className={`${compact ? 'compact-pill' : 'action-pill'} vote-pill ${active}`}>
        <button className="vote-btn vote-up" data-action="upvote" aria-label="Upvote" aria-pressed={post.userVote === 1}><PostIcon name="up" /></button>
        <span className="vote-count">{formatCount(post.score)}</span>
        <button className="vote-btn vote-down" data-action="downvote" aria-label="Downvote" aria-pressed={post.userVote === -1}><PostIcon name="down" /></button>
    </div>;
}

export function JoinButton({ community, compact = false }) {
    const { user } = useAuth();
    const joined = user?.joinedCommunities?.some(c => c.name.toLowerCase() === community.name.toLowerCase());
    if (joined) return null;
    return <button className={compact ? 'compact-btn-join' : 'btn-post-join'} data-action="join" data-join-community={community.name}>Join</button>;
}

export function PostMenu({ post, detail = false, open }) {
    const { isLoggedIn, user } = useAuth();
    return <div className="post-options-wrapper">
        <button className="btn-post-more" data-action="menu" aria-label="Post options" aria-haspopup="true" aria-expanded={open}><PostIcon name="more" /></button>
        <div className={`post-options-menu${open ? '' : ' hidden'}`} role="menu">
            <button className="post-option-item" data-action="save">{post.saved ? 'Unsave' : 'Save'}</button>
            <button className="post-option-item" data-action="hide">{post.hidden ? 'Unhide' : 'Hide'}</button>
            <button className="post-option-item" data-action="copy">Copy link</button>
            {isLoggedIn && !post.isAuthor && <button className="post-option-item" data-action="report">Report</button>}
            {post.isAuthor && <>
                {detail ? <button className="post-option-item" data-action="edit">Edit post</button> : <a className="post-option-item" href={`${postUrl(post)}&edit=1`}>Edit post</a>}
                <button className="post-option-item delete-option" data-action="delete">Delete</button>
            </>}
            {!post.isAuthor && post.canModerate && user?.prefs?.modMode !== false && <button className="post-option-item delete-option" data-action="delete">Remove (mod)</button>}
        </div>
    </div>;
}

function MediaItem({ media, title, active }) {
    const video = useRef(null);
    useEffect(() => { if (!active) video.current?.pause(); }, [active]);
    const props = { className: `post-image rc-media-item ${active ? '' : 'hidden'}`, src: media.url };
    return media.type === 'video' ? <video ref={video} {...props} controls preload="metadata" /> : <img {...props} alt={title} loading="lazy" />;
}

export function PostMedia({ post, detail, index, revealed }) {
    if (!post.media.length) return null;
    const blurred = !detail && isSensitive(post) && !revealed;
    return <div className={`post-carousel-container rc-media ${blurred ? 'rc-blurred' : ''}`} data-index={index}>
        <div className="carousel-track">{post.media.map((media, i) => <MediaItem key={`${i}:${media.url}`} media={media} title={post.title} active={i === index} />)}</div>
        {post.media.length > 1 && <>
            <button className="carousel-arrow arrow-left" data-action="prev" aria-label="Previous image"><PostIcon name="left" /></button>
            <button className="carousel-arrow arrow-right" data-action="next" aria-label="Next image"><PostIcon name="right" /></button>
            <div className="carousel-indicators">{post.media.map((media, i) => <span key={`${i}:${media.url}`} className={`dot ${i === index ? 'active' : ''}`} data-dot={i} />)}</div>
        </>}
        {blurred && <button className="rc-reveal-btn" data-action="reveal">View {post.tags.includes('NSFW') ? 'NSFW' : 'spoiler'} content</button>}
    </div>;
}

export function CardContent({ post, showCommunity, detail, menuOpen, index, revealed }) {
    const Title = detail ? 'h1' : 'h2';
    return <>
        <header className="post-header">
            <div className="post-meta-left">
                {showCommunity ? <>
                    <Markup html={communityIcon(post.community, 24)} />
                    <a href={communityUrl(post.community.name)} className="post-community-name">{`r/${post.community.name}`}</a>
                    <span className="post-dot-separator">•</span>
                    <span className="post-timestamp" title={new Date(post.createdAt).toLocaleString()}>{timeAgo(post.createdAt)}</span>
                    {detail && <><span className="post-dot-separator">•</span><a className="rc-author-link" href={userUrl(post.author.username)}>{`u/${post.author.username}`}</a></>}
                </> : <>
                    <Markup html={userAvatar(post.author, 24)} /><a href={userUrl(post.author.username)} className="post-community-name">{`u/${post.author.username}`}</a>
                    <span className="post-dot-separator">•</span><span className="post-timestamp">{timeAgo(post.createdAt)}</span>
                </>}
                {post.edited && <><span className="post-dot-separator">•</span><span className="post-timestamp">edited</span></>}
            </div>
            <div className="post-meta-right">{showCommunity && <JoinButton community={post.community} />}<PostMenu post={post} detail={detail} open={menuOpen} /></div>
        </header>
        {!!post.tags.length && <div className="post-tags-row">{post.tags.map(tag => <span key={tag} className={`post-tag-chip rc-tag-${tag.toLowerCase()}`}>{tag}</span>)}</div>}
        <Title className="post-title rc-post-title">{detail ? post.title : <a href={postUrl(post)}>{post.title}</a>}</Title>
        {post.url && <a className="rc-link-preview" href={post.url} target="_blank" rel="noopener noreferrer nofollow">
            <span className="rc-link-domain">{domainOf(post.url)} <PostIcon name="external" /></span><span className="rc-link-url">{post.url}</span>
        </a>}
        {post.body && (detail || (!post.media.length && !post.tags.includes('Spoiler'))) && <div className={`post-body-rich ${detail ? 'rc-post-body' : 'rc-body-preview'}`}><Markup html={post.body} /></div>}
        <PostMedia post={post} detail={detail} index={index} revealed={revealed} />
        <footer className="post-action-bar">
            <VoteControls post={post} />
            <a className="action-pill comment-pill" href={`${postUrl(post)}#comments`} aria-label="Comments"><PostIcon name="comment" /><span className="rc-comment-count">{formatCount(post.commentCount)}</span></a>
            <button className="action-pill share-pill" data-action="save" aria-label="Save post"><PostIcon name="save" /><span className="rc-save-label">{post.saved ? 'Saved' : 'Save'}</span></button>
            <button className="action-pill share-pill" data-action="share"><PostIcon name="share" /><span>Share</span></button>
        </footer>
    </>;
}

export function CompactContent({ post, showCommunity, menuOpen }) {
    const thumb = post.media.find(m => m.type === 'image');
    const video = !thumb && post.media.find(m => m.type === 'video');
    return <>
        <a className="compact-thumb" href={postUrl(post)} aria-hidden="true" tabIndex={-1}>
            {thumb ? <img src={thumb.url} alt="" className={`compact-thumb-img ${isSensitive(post) ? 'rc-blur-thumb' : ''}`} loading="lazy" /> : <span className="rc-compact-placeholder">{video ? '▶' : post.url ? '🔗' : '📝'}</span>}
            {post.media.length > 1 && <span className="compact-badge">{post.media.length}</span>}
        </a>
        <div className="compact-body">
            <div className="compact-header">
                {showCommunity ? <><Markup html={communityIcon(post.community, 20)} /><a href={communityUrl(post.community.name)} className="compact-community-name">{`r/${post.community.name}`}</a><JoinButton community={post.community} compact /></> : <a href={userUrl(post.author.username)} className="compact-community-name">{`u/${post.author.username}`}</a>}
                <span>•</span><span>{timeAgo(post.createdAt)}</span>
            </div>
            <h2 className="compact-title"><a href={postUrl(post)}>{post.title}</a></h2>
            <div className="compact-footer">
                <button className="compact-pill" data-action="expand" title="Expand post"><PostIcon name="expand" /></button>
                <VoteControls post={post} compact />
                <a className="compact-pill" href={`${postUrl(post)}#comments`}><PostIcon name="comment" /><span>{`${formatCount(post.commentCount)} comment${post.commentCount === 1 ? '' : 's'}`}</span></a>
                <button className="compact-pill" data-action="save"><span className="rc-save-label">{post.saved ? 'Saved' : 'Save'}</span></button>
                <button className="compact-pill" data-action="share">Share</button><PostMenu post={post} open={menuOpen} />
            </div>
        </div>
    </>;
}
