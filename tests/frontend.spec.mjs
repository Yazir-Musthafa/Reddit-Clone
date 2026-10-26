import { test, expect } from '@playwright/test';

const unique = prefix => `${prefix}${Date.now().toString(36)}`;
let browserErrors;
test.beforeEach(async ({ page }) => { browserErrors = []; page.on('pageerror', error => browserErrors.push(error.message)); });
test.afterEach(async () => { expect(browserErrors).toEqual([]); });
async function goto(page, url) { await page.goto(url); await expect(page.locator('#header-container header')).toBeVisible(); }
async function createPost(request, extra = {}) {
    const response = await request.post('/api/posts', { data: { community: 'funny', title: unique('React test '), body: '<p>Original body</p>', ...extra } });
    expect(response.ok(), await response.text()).toBeTruthy();
    const post = (await response.json()).post;
    await request.post(`/api/posts/${post.id}/vote`, { data: { dir: 0 } });
    return post;
}
async function confirm(page) { await page.locator('.ui-dialog.active [data-confirm]').click(); }

test('feed sort, time, card/compact view, navigation and history', async ({ page }) => {
    await goto(page, '/index.html?view=all');
    await expect(page.locator('.feed-post').first()).toBeVisible();
    await page.locator('#feedSortBtn').click();
    await page.locator('[data-sort="top"]').click();
    await expect(page).toHaveURL(/sort=top/);
    await page.locator('#feedTimeBtn').click();
    await page.locator('[data-time="all"]').click();
    await expect(page).toHaveURL(/t=all/);
    await page.locator('#feedViewBtn').click();
    await page.locator('[data-view="compact"]').click();
    await expect(page.locator('.compact-post-card').first()).toBeVisible();
    await page.locator('[data-action="expand"]').first().click();
    await expect(page.locator('.post-card').first()).toBeVisible();
    await page.locator('#feedViewBtn').click();
    await page.locator('[data-view="card"]').click();
    await page.locator('#sidebarAuthedDrawer [data-nav="explore"]').click();
    await expect(page.locator('.explore-page-title')).toBeVisible();
    await page.goBack();
    await expect(page.locator('#feedSortBtn')).toBeVisible();
    await expect(page.locator('#currentSortLabel')).toHaveText('Top');
    await expect(page.locator('#currentTimeLabel')).toHaveText('All Time');
    await page.locator('#sidebarAuthedDrawer [data-nav="news"]').click();
    await expect(page.locator('.news-feed-view')).toBeVisible();
});

test('controlled comment form preserves errors, blocks duplicates and submits with the keyboard', async ({ page, request }) => {
    const post = await createPost(request);
    await goto(page, `/post.html?id=${post.id}`);
    const form = page.locator('#commentComposerSlot form');
    const textarea = form.locator('textarea');
    const submit = form.locator('[type="submit"]');
    await textarea.fill('   ');
    await expect(submit).toBeDisabled();
    let requests = 0;
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    await page.route(`**/api/posts/${post.id}/comments`, async route => {
        if (route.request().method() !== 'POST') return route.continue();
        requests++;
        if (requests === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Please retry this comment' }) });
        await pending;
        await route.continue();
    });
    await textarea.fill('A controlled comment survives failure');
    await submit.click();
    await expect(page.locator('.toast-msg', { hasText: 'Please retry this comment' })).toBeVisible();
    await expect(textarea).toHaveValue('A controlled comment survives failure');
    await expect(submit).toBeEnabled();
    await textarea.press('Control+Enter');
    await expect(submit).toBeDisabled();
    await textarea.press('Control+Enter');
    expect(requests).toBe(2);
    release();
    await expect(textarea).toHaveValue('');
    await expect(submit).toBeDisabled();
    await expect(page.locator('.rc-comment-body', { hasText: 'A controlled comment survives failure' })).toHaveCount(1);
    const comment = page.locator('.rc-comment').first();
    await comment.locator('[data-action="reply"]').first().click();
    await comment.locator('.rc-reply-slot textarea').fill('Cancelled reply');
    await comment.locator('.rc-reply-slot [data-cancel]').click();
    await expect(comment.locator('.rc-reply-slot textarea')).toHaveCount(0);
    await comment.locator('[data-action="edit"]').first().click();
    await expect(comment.locator('.rc-comment-composer textarea')).toHaveValue('A controlled comment survives failure');
    await comment.locator('.rc-comment-composer textarea').fill('Cancelled edit');
    await comment.locator('.rc-comment-composer [data-cancel]').click();
    await expect(comment.locator('.rc-comment-body').first()).toHaveText('A controlled comment survives failure');
});

test('session Context refreshes membership in every rendered post card without reloading', async ({ page, request }) => {
    const session = await (await request.get('/api/auth/me')).json();
    if (session.user.joinedCommunities.some(c => c.name === 'funny')) await request.post('/api/communities/funny/join');
    const first = await createPost(request);
    const second = await createPost(request);
    try {
        await goto(page, '/index.html?view=all&sort=new');
        await page.evaluate(() => { window.contextTestDocument = 'same document'; });
        const cards = [first, second].map(post => page.locator(`[data-post-id="${post.id}"]`));
        for (const card of cards) await expect(card.locator('[data-action="join"]')).toBeVisible();
        await cards[0].locator('[data-action="join"]').click();
        for (const card of cards) await expect(card.locator('[data-action="join"]')).toHaveCount(0);
        expect(await page.evaluate(() => window.contextTestDocument)).toBe('same document');
    } finally {
        const updated = await (await request.get('/api/auth/me')).json();
        const wasJoined = session.user.joinedCommunities.some(c => c.name === 'funny');
        const isJoined = updated.user.joinedCommunities.some(c => c.name === 'funny');
        if (wasJoined !== isJoined) await request.post('/api/communities/funny/join');
    }
});

test('post voting, saving, hiding and undo', async ({ page, request }) => {
    const post = await createPost(request);
    await goto(page, '/index.html?view=all&sort=new');
    const card = page.locator(`[data-post-id="${post.id}"]`);
    await card.locator('[data-action="upvote"]').click();
    await expect(card.locator('.vote-pill')).toHaveClass(/voted-up/);
    await card.locator('[data-action="upvote"]').click();
    await expect(card.locator('.vote-pill')).not.toHaveClass(/voted-up/);
    await card.locator('.share-pill[data-action="save"]').click();
    await expect(card.locator('.rc-save-label')).toHaveText('Saved');
    await card.locator('[data-action="menu"]').click();
    await card.locator('[data-action="hide"]').click();
    const hidden = page.locator('.rc-hidden-placeholder');
    await expect(hidden).toBeVisible();
    await hidden.getByRole('button', { name: 'Undo' }).click();
    await expect(card).toBeVisible();
    await goto(page, '/user.html?u=demo_user&tab=saved');
    await expect(page.locator(`[data-post-id="${post.id}"]`)).toBeVisible();
});

test('post editing, threaded comments, comment editing/voting/deletion', async ({ page, request }) => {
    const post = await createPost(request);
    await goto(page, `/post.html?id=${post.id}`);
    await page.locator('#postSlot [data-action="menu"]').click();
    await page.locator('#postSlot [data-action="edit"]').click();
    await page.locator('.rc-edit-editor').fill('Edited body');
    await page.locator('.rc-edit-box [data-save]').click();
    await expect(page.locator('.rc-post-body')).toContainText('Edited body');
    await page.locator('#commentComposerSlot textarea').fill('First React comment');
    await page.locator('#commentComposerSlot [type="submit"]').click();
    const comment = page.locator('.rc-comment').first();
    await expect(comment.locator('.rc-comment-body').first()).toHaveText('First React comment');
    await comment.locator('[data-action="reply"]').first().click();
    await comment.locator('.rc-reply-slot textarea').fill('Nested React reply');
    await comment.locator('.rc-reply-slot [type="submit"]').click();
    await expect(page.locator('.rc-comment-body', { hasText: 'Nested React reply' })).toBeVisible();
    await comment.locator('.rc-collapse-toggle').first().click();
    await expect(comment).toHaveClass(/collapsed/);
    await comment.locator('.rc-collapse-toggle').first().click();
    await comment.locator('[data-action="edit"]').first().click();
    await comment.locator('.rc-comment-composer textarea').fill('Edited React comment');
    await comment.locator('.rc-comment-composer [type="submit"]').click();
    await expect(comment.locator('.rc-comment-body').first()).toHaveText('Edited React comment');
    await comment.locator('[data-action="upvote"]').first().click();
    await expect(comment.locator('.vote-pill').first()).not.toHaveClass(/voted-up/);
    await page.locator('#commentSortSelect').selectOption('new');
    await expect(page.locator('.rc-comment-body', { hasText: 'Edited React comment' })).toBeVisible();
    await comment.locator('[data-action="delete"]').first().click();
    await confirm(page);
    await expect(comment.locator('.rc-comment-body').first()).toContainText('This comment was deleted');
    await page.locator('#postSlot [data-action="menu"]').click();
    await page.locator('#postSlot [data-action="delete"]').click();
    await confirm(page);
    await expect(page).toHaveURL(/community.html/);
});

test('create a post with rich text, link, image, tags and draft restore', async ({ page }) => {
    const title = unique('React draft ');
    await goto(page, '/submit.html?community=funny');
    await page.locator('#createPostTitle').fill(title);
    await page.locator('#createPostBody').fill('Draft body survives a reload');
    await page.locator('#createPostUrl').fill('https://example.com');
    await page.locator('#addTagsBtn').click();
    await page.locator('.tag-option-btn').first().click();
    await expect(page.locator('.tag-badge-pill')).toHaveCount(1);
    await page.locator('#imageFileInput').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1kAAAAASUVORK5CYII=', 'base64') });
    await expect(page.locator('.media-preview-card img')).toBeVisible();
    await page.locator('#saveDraftBtn').click();
    await expect(page.locator('.toast-msg', { hasText: 'Draft saved!' })).toBeVisible();
    await page.reload();
    await page.locator('#draftsLink').click();
    const draft = page.locator('.draft-item-card', { hasText: title });
    await draft.locator('.btn-load-draft').click();
    await expect(page.locator('#createPostTitle')).toHaveValue(title);
    await expect(page.locator('#createPostBody')).toContainText('Draft body survives');
    await expect(page.locator('.media-preview-card img')).toBeVisible();
    await page.locator('#submitPostBtn').click();
    await expect(page).toHaveURL(/post.html\?id=/);
    await expect(page.locator('.rc-post-title')).toHaveText(title);
    await expect(page.locator('.rc-link-url')).toHaveText('https://example.com/');
});

test('profile forms, preferences, dark mode persistence and search tabs', async ({ page }) => {
    await goto(page, '/settings.html?tab=profile');
    const name = unique('React ');
    await page.locator('#displayName').fill(name);
    await page.locator('#bio').fill('Testing the React profile form');
    await page.locator('#profileForm [type="submit"]').click();
    await expect(page.locator('.toast-msg', { hasText: 'Profile saved' })).toBeVisible();
    await page.reload();
    await expect(page.locator('#displayName')).toHaveValue(name);
    await page.locator('[data-tab="preferences"]').click();
    await page.locator('label[for="prefDark"]').click();
    await expect(page.locator('html')).toHaveClass(/dark-mode/);
    await page.locator('#prefView').selectOption('compact');
    await expect(page.locator('.toast-msg', { hasText: 'Default view saved' })).toBeVisible();
    await page.reload();
    await expect(page.locator('#prefView')).toHaveValue('compact');
    await page.locator('#prefView').selectOption('card');
    await page.locator('label[for="prefDark"]').click();
    await goto(page, '/search.html?q=art');
    for (const tab of ['communities', 'people', 'comments', 'posts']) {
        await page.locator(`[data-tab="${tab}"]`).click();
        await expect(page).toHaveURL(new RegExp(`type=${tab}`));
        await expect(page.locator('#searchResults')).not.toBeEmpty();
    }
});

test('community creation, mod settings, join/leave and custom feeds', async ({ page }) => {
    const name = unique('react');
    await goto(page, '/communities.html');
    await page.locator('#manageStartCommunity').click();
    await page.locator('#topicsGrid .topic-pill').first().click();
    await page.locator('#btnNextStep1').click();
    await page.locator('#btnNextStep2').click();
    await page.locator('#commNameInput').fill(name);
    await page.locator('#commDescInput').fill('React community');
    await page.locator('#btnCreateCommunitySubmit.active').click();
    await page.locator('#btnGoToCommunity').click();
    await expect(page).toHaveURL(new RegExp(`name=${name}`));
    await page.locator('#modToolsBtn').click();
    await page.locator('[data-tool="settings"]').click();
    await page.locator('#ui-field-description').fill('Updated React community');
    await page.locator('.ui-dialog .ui-form [type="submit"]').click();
    await expect(page.locator('#communityAside')).toContainText('Updated React community');
    await page.locator('#communityJoinBtn').click();
    await expect(page.locator('#communityJoinBtn')).toHaveText('Join');
    await page.locator('#communityJoinBtn').click();
    await expect(page.locator('#communityJoinBtn')).toHaveText('Joined');
    await page.locator('#btnCreateCustomFeed').click();
    await page.locator('#ui-field-name').fill(name);
    await page.locator('.ui-checkbox-list input').first().check();
    await page.locator('.ui-dialog .ui-form [type="submit"]').click();
    await expect(page).toHaveURL(/view=custom/);
    await expect(page.locator('.rc-feed-header h1')).toHaveText(name);
    await page.locator('#editCustomFeedBtn').click();
    await page.locator('#ui-field-name').fill(`${name} edited`);
    await page.locator('.ui-dialog .ui-form [type="submit"]').click();
    await expect(page.locator('.rc-feed-header h1')).toHaveText(`${name} edited`);
    await page.locator('#deleteCustomFeedBtn').click();
    await confirm(page);
    await expect(page).toHaveURL(/view=home/);
});

test('chat conversation, send, reopen, notifications', async ({ page }) => {
    await goto(page, '/');
    await page.locator('#headerChatBtn').click();
    await page.locator('#chatsNewBtn').click();
    await page.locator('#newChatUsername').fill('Pixel-Artisan99');
    await page.locator('#newChatForm').evaluate(form => form.requestSubmit());
    await expect(page.locator('#activeChatUserName')).toHaveText('Pixel-Artisan99');
    const text = unique('React chat ');
    await page.locator('#chatMessageInput').fill(text);
    await page.locator('#btnSendChatMessage').click();
    await expect(page.locator('.msg-text-bubble', { hasText: text })).toBeVisible();
    await page.locator('#btnCloseChats').click();
    await page.locator('#headerChatBtn').click();
    await expect(page.locator('.msg-text-bubble', { hasText: text })).toBeVisible();
    await page.locator('#btnCloseChats').click();
    await page.locator('#headerBellBtn').click();
    await expect(page.locator('#notifDropdown')).toBeVisible();
    await page.locator('#notifMarkAllBtn').click();
});

test('careers filters/detail/back and press filters/detail/inquiry', async ({ page }) => {
    await goto(page, '/careers.html');
    await page.locator('#jobSearch').fill('engineer');
    await expect(page.locator('.rc-job-row').first()).toBeVisible();
    await page.locator('.rc-job-row').first().click();
    await expect(page.locator('#applyForm')).toBeVisible();
    await page.locator('#applyName').fill('React Tester');
    await page.locator('#applyForm [type="submit"]').click();
    await expect(page.locator('#applyError')).toContainText('resume');
    await page.locator('#backToJobs').click();
    await expect(page.locator('#jobSearch')).toBeVisible();
    await goto(page, '/press.html');
    await page.locator('#releaseCategories [data-category]').nth(1).click();
    await page.locator('.rc-release-row').first().click();
    await expect(page).toHaveURL(/release=/);
    await page.goBack();
    await expect(page.locator('#inquiryForm')).toBeVisible();
    await page.locator('#inqName').fill('React Tester');
    await page.locator('#inqEmail').fill('react-test@example.com');
    await page.locator('#inqOutlet').fill('Local QA');
    await page.locator('#inqTopic').fill('React migration');
    await page.locator('#inqMessage').fill('Testing the local React migration inquiry form.');
    await page.locator('#inquiryForm [type="submit"]').click();
    await expect(page.locator('#mediaInquiry')).toContainText('Thanks');
});

test.describe('guest authentication', () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test('login validation, password visibility and authenticated session', async ({ page }) => {
        await goto(page, '/');
        await page.locator('#headerLoginBtn').click();
        await page.locator('#modalInputUser').fill('demo_user');
        await page.locator('#modalInputPass').fill('wrong-password');
        await page.locator('#togglePasswordBtn').click();
        await expect(page.locator('#modalInputPass')).toHaveAttribute('type', 'text');
        await page.locator('#modalSubmitBtn').click();
        await expect(page.locator('.auth-error')).toContainText('Incorrect');
        await page.locator('#modalInputPass').fill('password123');
        await page.locator('#modalSubmitBtn').click();
        await expect(page.locator('#userProfileBtn')).toBeVisible();
        await page.locator('#userProfileBtn').click();
        await page.locator('#profileLogoutBtn').click();
        await expect(page.locator('#headerLoginBtn')).toBeVisible();
    });
    test('six-step signup and email-code verification', async ({ page }) => {
        const name = unique('react');
        await goto(page, '/');
        await page.locator('#headerSignupBtn').click();
        await page.locator('#signUpEmail').fill(`${name}@example.com`);
        await page.locator('#step1ContinueBtn').click();
        const code = await page.locator('.auth-dev-code strong').innerText();
        await page.locator('#verifyCodeInput').fill(code);
        await page.locator('#step2ContinueBtn').click();
        await page.locator('#signUpUsername').fill(name);
        await page.locator('#signUpPassword').fill('reactPassword123');
        await page.locator('#step3ContinueBtn.enabled').click();
        await page.locator('#step4SkipBtn').click();
        await page.locator('.interest-grid-card[data-name="Art"]').click();
        await page.locator('#step5ContinueBtn').click();
        await page.locator('[data-topic="Digital Art"]').click();
        await page.locator('#step6FinishBtn').click();
        await expect(page.locator('#userProfileBtn')).toBeVisible();
        await page.locator('#userProfileBtn').click();
        await expect(page.locator('#dropdownUsername')).toHaveText(`u/${name}`);
    });
});
