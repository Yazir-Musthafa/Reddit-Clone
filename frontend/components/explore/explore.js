import { api } from '../../js/api.js';
import { authState } from '../../js/auth-state.js';
import { toggleJoin } from '../../js/ui.js';
import { escapeHtml, formatCount } from '../../js/utils.js';

const HIDDEN_TOPICS = ['Adult Content', 'Mature Topics'];

function cardHtml(c) {
    const joined = authState.isJoined(c.name);
    return `
        <a class="explore-community-card" href="community.html?name=${encodeURIComponent(c.name)}">
            <div class="community-avatar-circle no-invert" style="background-color: ${escapeHtml(c.color)}">
                <span>${escapeHtml(c.icon || c.name.charAt(0).toUpperCase())}</span>
            </div>
            <div class="community-info-box">
                <h3 class="community-name-heading">r/${escapeHtml(c.name)}</h3>
                <span class="community-stats-meta">${formatCount(c.memberCount)} members</span>
                <p class="community-desc-text">${escapeHtml(c.description)}</p>
            </div>
            <button class="btn-community-join ${joined ? 'joined' : ''}" data-join-community="${escapeHtml(c.name)}">${joined ? 'Joined' : 'Join'}</button>
        </a>`;
}

function bindCards(root, communities) {
    root.querySelectorAll('.btn-community-join').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const community = communities.find(c => c.name === btn.dataset.joinCommunity);
            if (community) toggleJoin(community);
        };
    });
}

export async function initExplore() {
    const tabsScroll = document.getElementById('exploreTabsScroll');
    const content = document.getElementById('exploreContent');
    const showMature = !!authState.user?.prefs?.showMature;

    document.getElementById('exploreTabsNextBtn').onclick = () => {
        tabsScroll.scrollBy({ left: 240, behavior: 'smooth' });
    };

    let topics = [];
    let all = [];
    try {
        const [topicData, communityData] = await Promise.all([
            api.get('/communities/topics'),
            api.get('/communities?limit=100')
        ]);
        topics = topicData.topics.filter(t => showMature || !HIDDEN_TOPICS.includes(t));
        all = communityData.communities;
    } catch (err) {
        content.innerHTML = `<div class="rc-empty-state"><p>${escapeHtml(err.message)}</p></div>`;
        return;
    }

    const topicsWithCommunities = topics.filter(t => all.some(c => c.topic === t));
    tabsScroll.insertAdjacentHTML('beforeend', topicsWithCommunities
        .map(t => `<button class="explore-tab-pill" data-category="${escapeHtml(t)}" role="tab">${escapeHtml(t)}</button>`).join(''));

    const selectTab = (category) => {
        tabsScroll.querySelectorAll('.explore-tab-pill').forEach(p => p.classList.toggle('active', p.dataset.category === category));
        tabsScroll.querySelector('.explore-tab-pill.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        if (category === 'all') renderAll();
        else renderTopic(category);
    };

    tabsScroll.querySelectorAll('.explore-tab-pill').forEach(pill => {
        pill.onclick = () => selectTab(pill.dataset.category);
    });

    function renderAll() {
        const interests = new Set(authState.user?.interests || []);
        const recommended = all.filter(c => !authState.isJoined(c.name)).slice(0, 6);
        const sections = [
            { title: authState.user ? 'Recommended for you' : 'Most popular', topic: null, items: recommended },
            ...topicsWithCommunities
                .sort((a, b) => Number(interests.has(b)) - Number(interests.has(a)))
                .map(t => ({ title: t, topic: t, items: all.filter(c => c.topic === t) }))
        ].filter(s => s.items.length);

        content.innerHTML = sections.map(s => `
            <section class="explore-category-section">
                <h2 class="category-section-title">${escapeHtml(s.title)}</h2>
                <div class="community-cards-grid">${s.items.slice(0, 6).map(cardHtml).join('')}</div>
                ${s.topic && s.items.length > 6 ? `<div class="show-more-wrapper"><button class="btn-show-more-category" data-topic="${escapeHtml(s.topic)}">Show more</button></div>` : ''}
            </section>`).join('');

        content.querySelectorAll('.btn-show-more-category').forEach(btn => {
            btn.onclick = () => selectTab(btn.dataset.topic);
        });
        bindCards(content, all);
    }

    async function renderTopic(topic) {
        content.innerHTML = `
            <section class="explore-category-section">
                <h2 class="category-section-title">${escapeHtml(topic)} Communities</h2>
                <div class="community-cards-grid" id="topicGrid"></div>
                <div class="show-more-wrapper hidden" id="topicMoreWrapper"><button class="btn-show-more-category" id="topicMoreBtn">Show more</button></div>
            </section>`;
        const grid = content.querySelector('#topicGrid');
        const moreWrapper = content.querySelector('#topicMoreWrapper');
        const loaded = [];
        let page = 0;

        const loadPage = async () => {
            try {
                const { communities, hasMore } = await api.get(`/communities?topic=${encodeURIComponent(topic)}&limit=24&page=${page}`);
                page += 1;
                loaded.push(...communities);
                grid.insertAdjacentHTML('beforeend', communities.map(cardHtml).join(''));
                bindCards(grid, loaded);
                moreWrapper.classList.toggle('hidden', !hasMore);
                if (!loaded.length) grid.innerHTML = '<p class="rc-muted-text">No communities in this topic yet.</p>';
            } catch (err) {
                grid.insertAdjacentHTML('beforeend', `<p class="rc-muted-text">${escapeHtml(err.message)}</p>`);
            }
        };
        content.querySelector('#topicMoreBtn').onclick = loadPage;
        loadPage();
    }

    renderAll();
}
