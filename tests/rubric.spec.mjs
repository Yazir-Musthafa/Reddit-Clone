import { test, expect } from '@playwright/test';

let errors;
test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /React|controlled|uncontrolled|unique.*key/.test(message.text())) errors.push(message.text()); });
});
test.afterEach(() => expect(errors).toEqual([]));

async function open(page, path) {
    await page.goto(path);
    await expect(page.locator('#header-container header')).toBeVisible();
}

async function createPost(request) {
    const response = await request.post('/api/posts', { data: { community: 'funny', title: `Rubric ${Date.now()}`, body: '<p>Immutable post state</p>' } });
    expect(response.ok()).toBeTruthy();
    const { post } = await response.json();
    await request.post(`/api/posts/${post.id}/vote`, { data: { dir: 0 } });
    return post;
}

test('controlled account forms validate before requests, retain errors and reset after success', async ({ page, request }) => {
    await open(page, '/settings.html');
    let emailRequests = 0;
    const { user } = await (await request.get('/api/auth/me')).json();
    await page.route('**/api/users/me/email', async route => {
        emailRequests++;
        if (emailRequests === 1) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Incorrect password' }) });
        expect(route.request().postDataJSON()).toEqual({ email: 'rubric@example.com', password: 'password123' });
        return route.fulfill({ json: { user: { ...user, email: 'rubric@example.com' } } });
    });
    await page.locator('#emailForm [type=submit]').click();
    await expect(page.locator('#emailForm [data-error]')).toContainText('valid email');
    expect(emailRequests).toBe(0);
    await page.locator('#newEmail').fill('rubric@example.com');
    await page.locator('#emailPassword').fill('wrong');
    await page.locator('#emailForm [type=submit]').click();
    await expect(page.locator('#emailForm [data-error]')).toHaveText('Incorrect password');
    await expect(page.locator('#newEmail')).toHaveValue('rubric@example.com');
    await page.locator('#emailPassword').fill('password123');
    await page.locator('#emailForm [type=submit]').click();
    await expect(page.locator('#newEmail')).toHaveValue('');
    await expect(page.locator('#emailPassword')).toHaveValue('');
    await expect(page.locator('#emailForm strong')).toHaveText('rubric@example.com');
    await page.locator('#currentPassword').fill('password123');
    await page.locator('#newPassword').fill('12345678');
    await page.locator('#confirmPassword').fill('different');
    await page.locator('#passwordForm [type=submit]').click();
    await expect(page.locator('#passwordForm [data-error]')).toContainText("don't match");
    await expect(page.locator('#confirmPassword')).toHaveAttribute('aria-invalid', 'true');
});

test('settings routes support back, forward, reload, fallback and dynamic profile styles', async ({ page }) => {
    await open(page, '/settings.html?tab=profile');
    await page.evaluate(() => { window.rubricDocument = 'same'; });
    await page.locator('[data-color="#FF4500"]').click();
    await expect(page.locator('#avatarColorInput')).toHaveValue('#ff4500');
    await expect(page.locator('[data-color="#FF4500"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#avatarPreviewImg circle').first()).toHaveAttribute('fill', '#FF4500');
    await page.locator('[data-tab="preferences"]').click();
    await expect(page).toHaveURL(/tab=preferences/);
    await page.goBack();
    await expect(page.locator('#profileForm')).toBeVisible();
    await page.goForward();
    await expect(page.locator('#prefView')).toBeVisible();
    expect(await page.evaluate(() => window.rubricDocument)).toBe('same');
    await page.reload();
    await expect(page.locator('[data-tab="preferences"]')).toHaveAttribute('aria-selected', 'true');
    await open(page, '/settings.html?tab=toString');
    await expect(page.locator('#emailForm')).toBeVisible();
});

test('failed preference save restores the controlled selection and browser preference', async ({ page }) => {
    await open(page, '/settings.html?tab=preferences');
    const select = page.locator('#prefView');
    const previous = await select.inputValue();
    const stored = await page.evaluate(() => localStorage.getItem('rc_view'));
    await page.route('**/api/users/me', route => route.request().method() === 'PATCH' ? route.fulfill({ status: 503, json: { error: 'Preference service unavailable' } }) : route.continue());
    await select.selectOption(previous === 'card' ? 'compact' : 'card');
    await expect(page.locator('.toast-msg', { hasText: 'Preference service unavailable' })).toBeVisible();
    await expect(select).toHaveValue(previous);
    expect(await page.evaluate(() => localStorage.getItem('rc_view'))).toBe(stored);
});

test('post vote rolls back on failure and persisted card state survives view changes', async ({ page, request }) => {
    const post = await createPost(request);
    await open(page, '/index.html?view=all&sort=new');
    const card = page.locator(`[data-post-id="${post.id}"]`);
    const score = await card.locator('.vote-count').textContent();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route(`**/api/posts/${post.id}/vote`, async route => {
        await gate;
        await route.fulfill({ status: 503, json: { error: 'Vote service unavailable' } });
    });
    await card.locator('[data-action="upvote"]').click();
    await expect(card.locator('.vote-pill')).toHaveClass(/voted-up/);
    release();
    await expect(page.locator('.toast-msg', { hasText: 'Vote service unavailable' })).toBeVisible();
    await expect(card.locator('.vote-count')).toHaveText(score);
    await expect(card.locator('.vote-pill')).not.toHaveClass(/voted-up/);
    await page.unroute(`**/api/posts/${post.id}/vote`);
    await card.locator('.share-pill[data-action="save"]').click();
    await expect(card.locator('.rc-save-label')).toHaveText('Saved');
    await page.locator('#feedViewBtn').click();
    await page.locator('[data-view="compact"]').click();
    await expect(card.locator('.rc-save-label')).toHaveText('Saved');
    await card.locator('[data-action="expand"]').click();
    await expect(card.locator('.rc-save-label')).toHaveText('Saved');
});

for (const width of [390, 768, 1440]) {
    test(`all 11 page entries fit the ${width}px viewport`, async ({ page, request }) => {
        await page.setViewportSize({ width, height: 900 });
        const { posts } = await (await request.get('/api/posts?feed=all')).json();
        const post = posts[0];
        const paths = ['/', `/post.html?id=${post.id}`, `/community.html?name=${post.community.name}`, '/communities.html', '/user.html?u=demo_user', '/search.html?q=art', '/submit.html', '/settings.html?tab=profile', '/careers.html', '/press.html', '/page.html?p=help'];
        for (const path of paths) {
            await open(page, path);
            await expect(page.locator('#feed-container')).not.toBeEmpty();
            await expect.poll(() => page.evaluate(() => ({ document: document.documentElement.scrollWidth <= innerWidth + 1, feed: document.getElementById('feed-container').scrollWidth <= document.getElementById('feed-container').clientWidth + 1 })), { message: `No horizontal overflow at ${width}px: ${path}` }).toEqual({ document: true, feed: true });
        }
    });
}

test('a saved collapsed sidebar does not squeeze mobile or tablet content', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('rc_sidebar_collapsed', 'true'));
    for (const width of [390, 768]) {
        await page.setViewportSize({ width, height: 900 });
        await open(page, '/index.html?view=all');
        await expect(page.locator('.feed-post').first()).toBeVisible();
        expect(await page.locator('#feed-container').evaluate(el => el.clientWidth)).toBeGreaterThan(width === 390 ? 350 : 600);
    }
});
