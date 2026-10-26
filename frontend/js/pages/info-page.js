import { initShell } from '../shell.js';
import { getParam, escapeHtml } from '../utils.js';

const NOT_IN_CLONE = '<p class="rc-info-note">This feature isn\'t part of this Reddit clone. The page is here so the link has somewhere to go.</p>';

const PAGES = {
    about: {
        title: 'About this Reddit clone',
        body: `<p>This is a full-stack Reddit clone: a vanilla HTML, CSS and JavaScript frontend talking to a Node.js + Express API backed by MongoDB.</p>
            <h2>What works</h2>
            <ul>
                <li>Sign up with email verification, log in, one-time code log in and password reset</li>
                <li>Communities: create, join, moderate, rules, approved users, private/restricted types</li>
                <li>Posts with rich text, links, images and video; voting, saving, hiding, reporting, editing and deleting</li>
                <li>Threaded comments with voting, replies, editing and deleting</li>
                <li>Home, Popular, News, All, Explore and custom feeds, sorted by Best, Hot, New, Top or Rising</li>
                <li>Search, user profiles, karma, achievements, chats and notifications</li>
            </ul>`
    },
    help: {
        title: 'Help Center',
        body: `<h2>Getting started</h2>
            <p><strong>Create an account:</strong> click Sign Up, enter your email and the 6-digit code, then pick a username and password. If the server has no email set up, the code is shown on screen.</p>
            <p><strong>Join communities:</strong> use Explore, search, or the Join button on any post. Joined communities make up your Home feed.</p>
            <h2>Posting</h2>
            <p>Click <strong>Create</strong> in the header, choose a community, add a title and optionally text, a link, images or video. Use <strong>Save Draft</strong> to finish later; drafts are listed under <em>Drafts</em>.</p>
            <h2>Comments &amp; voting</h2>
            <p>Open a post to comment. Reply to any comment, and use the arrows to vote. Your karma goes up when others upvote you.</p>
            <h2>Chats</h2>
            <p>Click the chat bubble in the header, then + to message someone by username. You can turn off chat requests in Settings → Preferences.</p>
            <h2>Forgot your password?</h2>
            <p>Click Log In → <em>Forgot password?</em>, enter your email and the code you receive, then choose a new password.</p>`
    },
    rules: {
        title: 'Reddit Rules',
        body: `<ol>
                <li>Remember the human. Don't harass, bully or threaten others.</li>
                <li>Abide by community rules. Post authentic content in communities where you have a personal interest.</li>
                <li>Respect the privacy of others. Don't share personal or confidential information.</li>
                <li>Don't post content that is illegal or that sexualises minors.</li>
                <li>Label content correctly: use the NSFW and Spoiler tags where appropriate.</li>
                <li>Don't impersonate people or organisations in a misleading way.</li>
                <li>Don't break the site or interfere with its normal use (spam, vote manipulation, bots).</li>
            </ol>
            <p>Use <em>Report</em> on any post or comment that breaks these rules.</p>`
    },
    privacy: {
        title: 'Privacy Policy',
        body: `<p>This clone stores what it needs to run: your email, a hashed password (bcrypt), your profile, and the posts, comments, votes, messages and drafts you create. It lives in the MongoDB database of whoever runs the server.</p>
            <p>You are signed in with an httpOnly cookie. Your display mode, feed layout and recently viewed posts are kept in your browser's local storage.</p>
            <p>You can change your email and password, or delete your account, from <a href="settings.html">Settings</a>.</p>`
    },
    'user-agreement': {
        title: 'User Agreement',
        body: `<p>By using this Reddit clone you agree to follow the <a href="page.html?p=rules">Reddit Rules</a> and the rules of each community you take part in.</p>
            <p>You own the content you post. Moderators may remove content that breaks their community's rules. Accounts that abuse the service may be removed by the server operator.</p>
            <p>The service is provided as-is, without warranties.</p>`
    },
    accessibility: {
        title: 'Accessibility',
        body: `<p>We aim to make this clone usable with a keyboard and screen readers: buttons are real buttons, menus close with Escape, dialogs are labelled, and vote buttons announce their state.</p>
            <p>Dark mode is available from the profile menu or Settings → Preferences.</p>`
    },
    'mod-code-of-conduct': {
        title: 'Moderator Code of Conduct',
        body: `<ol>
                <li>Create clear, visible rules for your community.</li>
                <li>Enforce rules consistently and in good faith.</li>
                <li>Don't use your moderator powers to harass or manipulate.</li>
                <li>Respect users' privacy.</li>
                <li>Keep your community active, and add co-moderators when it grows.</li>
            </ol>`
    },
    advertise: { title: 'Advertise on Reddit', body: `<p>Reach communities that care about what you do.</p>${NOT_IN_CLONE}` },
    blog: { title: 'Blog', body: `<p>Product updates and stories from communities.</p>${NOT_IN_CLONE}` },
    'developer-platform': {
        title: 'Developer Platform',
        body: `<p>This clone has a JSON API you can build on. Every endpoint lives under <code>/api</code>, for example:</p>
            <pre>GET  /api/posts?feed=popular&amp;sort=hot
GET  /api/posts/:id/comments
GET  /api/communities?topic=Technology
GET  /api/search?q=kerala&amp;type=posts
POST /api/posts            (logged in)
POST /api/posts/:id/vote   { "dir": 1 | 0 | -1 }</pre>
            <p>See the README for the full list.</p>`
    },
    'reddit-pro': { title: 'Reddit Pro', body: `<p>Tools for businesses and creators.</p>${NOT_IN_CLONE}` },
    premium: { title: 'Reddit Premium', body: `<p>An ad-free experience and extra perks.</p>${NOT_IN_CLONE}` },
    earn: { title: 'Earn', body: `<p>Get rewarded for great contributions.</p>${NOT_IN_CLONE}` },
    games: {
        title: 'Games on Reddit',
        body: `<p>Social Poker, Bonkyard, Slingblade and Dictionary Fills are games on the real Reddit.</p>${NOT_IN_CLONE}
            <p>Looking for gaming communities? Try <a href="index.html?view=explore">Explore → Games</a> or <a href="community.html?name=IndianPCGamers">r/IndianPCGamers</a>.</p>`
    },
    'best-of-reddit': {
        title: 'Best of Reddit',
        body: `<p>This clone doesn't have translated collections, but you can see the highest-voted posts of all time here:</p>
            <p><a class="ui-btn ui-btn-primary" href="index.html?view=popular&amp;sort=top&amp;t=all">See the top posts of all time</a></p>`
    }
};

const LANG_NAMES = { pt: 'Portuguese', de: 'German' };

// These sections have their own pages now.
const MOVED = { careers: 'careers.html', press: 'press.html' };
if (MOVED[getParam('p')]) window.location.replace(MOVED[getParam('p')]);

document.addEventListener('DOMContentLoaded', async () => {
    await initShell();
    const container = document.getElementById('feed-container');
    const key = getParam('p');
    const page = PAGES[key];

    if (!page) {
        document.title = 'Page not found - Reddit';
        container.innerHTML = `
            <div class="rc-empty-state">
                <h3>Page not found</h3>
                <p>The page you're looking for doesn't exist or has moved.</p>
                <a class="ui-btn ui-btn-primary" href="index.html">Go home</a>
            </div>`;
        return;
    }

    const lang = LANG_NAMES[getParam('lang')];
    const title = lang && key === 'best-of-reddit' ? `${page.title} in ${lang}` : page.title;
    document.title = `${title} - Reddit`;
    container.innerHTML = `
        <article class="rc-info-page">
            <h1>${escapeHtml(title)}</h1>
            ${page.body}
        </article>`;
});
