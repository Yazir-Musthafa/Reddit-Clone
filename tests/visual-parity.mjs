import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// Capture against the checkpoint, compare against React using the same API responses.
// Artifacts stay in ignored .data; no accounts or database records are modified.
const capture = process.argv.includes('--capture');
const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const dir = '.data/react-parity';
await fs.mkdir(dir, { recursive: true });
const fixturePath = `${dir}/responses.json`;
const fixtures = capture ? {} : JSON.parse(await fs.readFile(fixturePath, 'utf8'));
const browser = await chromium.launch();
const results = [];
const errors = [];
const frozenTime = 1793001600000;
for (const authed of [false, true]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  if (authed) {
    const response = await context.request.post(`${baseURL}/api/auth/login`, { data: { identifier: 'demo_user', password: 'password123' } });
    if (!response.ok()) throw new Error('Demo login failed');
  }
  const page = await context.newPage();
  await page.clock.setFixedTime(frozenTime);
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', async route => {
    const request = route.request();
    if (request.method() !== 'GET') return route.continue();
    const key = `${authed}:${new URL(request.url()).pathname}${new URL(request.url()).search}`;
    if (capture) {
      const response = await route.fetch();
      const body = await response.text();
      fixtures[key] = { status: response.status(), contentType: 'application/json', body };
    }
    if (!fixtures[key]) throw new Error(`Missing API fixture: ${key}`);
    await route.fulfill(fixtures[key]);
  });
  const posts = await (await context.request.get(`${baseURL}/api/posts?feed=popular`)).json();
  const post = posts.posts[0];
  const jobs = await (await context.request.get(`${baseURL}/api/careers/jobs`)).json();
  const releases = await (await context.request.get(`${baseURL}/api/press/releases`)).json();
  const routes = [
    ['home', '/'], ['popular', '/index.html?view=popular'], ['news', '/index.html?view=news'],
    ['all', '/index.html?view=all'], ['explore', '/index.html?view=explore'],
    ['community', `/community.html?name=${encodeURIComponent(post.community.name)}`],
    ['post', `/post.html?id=${post.id}`], ['profile', '/user.html?u=demo_user'],
    ['achievements', '/user.html?u=demo_user&tab=achievements'],
    ['search-posts', '/search.html?q=art'], ['search-communities', '/search.html?q=art&type=communities'],
    ['search-people', '/search.html?q=demo&type=people'], ['search-comments', '/search.html?q=the&type=comments'],
    ['communities', '/communities.html'], ['settings', '/settings.html'],
    ['settings-profile', '/settings.html?tab=profile'], ['preferences', '/settings.html?tab=preferences'],
    ['submit', '/submit.html'], ['careers', '/careers.html'], ['press', '/press.html'], ['info', '/page.html?p=help'],
    ...(jobs.jobs?.length ? [['job', `/careers.html?job=${jobs.jobs[0].slug}`]] : []),
    ...(releases.releases?.length ? [['release', `/press.html?release=${releases.releases[0].slug}`]] : [])
  ];
  for (const [name, route] of routes) {
    await page.goto(baseURL + route);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await snapshot(`${authed ? 'member' : 'guest'}-${name}`, page);
  }
  await page.goto(baseURL);
  await page.waitForLoadState('networkidle');
  await page.setViewportSize({ width: 390, height: 844 });
  await snapshot(`${authed ? 'member' : 'guest'}-mobile`, page);
  await page.evaluate(() => { localStorage.setItem('rc_display', 'dark'); document.documentElement.classList.add('dark-mode'); });
  await snapshot(`${authed ? 'member' : 'guest'}-mobile-dark`, page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await snapshot(`${authed ? 'member' : 'guest'}-desktop-dark`, page);
  await context.close();
}
async function snapshot(name, page) {
  const file = `${dir}/${name}.png`;
  const current = await page.screenshot({ animations: 'disabled' });
  if (capture) { await fs.writeFile(file, current); console.log('Captured', name); return; }
  const before = PNG.sync.read(await fs.readFile(file));
  const after = PNG.sync.read(current);
  const diff = new PNG({ width: before.width, height: before.height });
  const changed = pixelmatch(before.data, after.data, diff.data, before.width, before.height, { threshold: 0.1 });
  const ratio = changed / (before.width * before.height);
  results.push({ name, changed, ratio });
  if (changed) {
    await fs.writeFile(`${dir}/${name}-actual.png`, current);
    await fs.writeFile(`${dir}/${name}-diff.png`, PNG.sync.write(diff));
  }
  console.log(name, `${(ratio * 100).toFixed(3)}% pixels differ`);
}
if (capture) await fs.writeFile(fixturePath, JSON.stringify(fixtures));
await fs.writeFile(`${dir}/${capture ? 'baseline' : 'comparison'}-report.json`, JSON.stringify({ results, errors }, null, 2));
await browser.close();
if (errors.length) { console.error(errors); process.exitCode = 1; }
if (results.some(r => r.ratio > 0.001)) process.exitCode = 1;
