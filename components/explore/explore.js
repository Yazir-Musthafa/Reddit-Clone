import { showToast } from '../../js/interactions.js';

const filterCommunitiesMap = {
    'most-visited': [
        { name: 'AskReddit', visitors: '17M weekly visitors', desc: 'The go-to subreddit to ask and answer thought-provoking questions.', icon: '🤖', bg: '#0284C7' },
        { name: 'sachintendulkar', visitors: '15M weekly visitors', desc: 'A place to celebrate timeless moments, memories, and all things Sachin Tendulkar.', icon: '🏏', bg: '#B45309' },
        { name: 'whatisit', visitors: '14M weekly visitors', desc: 'A community dedicated to identifying mysterious objects, plants, animals, and more.', icon: '❓', bg: '#7C3AED' },
        { name: 'mildlyinfuriating', visitors: '12M weekly visitors', desc: 'Find comfort in knowing you\'re not alone in life\'s minor irritations.', icon: '😤', bg: '#EA580C' },
        { name: 'NoStupidQuestions', visitors: '9.5M weekly visitors', desc: 'A judgment-free zone for those curious about anything and everything.', icon: '❓', bg: '#2563EB' },
        { name: 'SipsTea', visitors: '8.8M weekly visitors', desc: 'Sip some tea and enjoy the internet\'s hottest viral videos and memes.', icon: '🐸', bg: '#16A34A' },
        { name: 'PeterExplainsTheJoke', visitors: '9M weekly visitors', desc: 'Have a meme or joke you can\'t figure out? This community has got you covered.', icon: '👓', bg: '#D97706' },
        { name: 'interestingasfuck', visitors: '8.5M weekly visitors', desc: 'Get lost in an incredible world of interesting and awe-inspiring content.', icon: '🌌', bg: '#475569' },
        { name: 'movies', visitors: '6.7M weekly visitors', desc: 'Film enthusiasts unite! Discuss, review, and share your favorite movies.', icon: '🎬', bg: '#DC2626' },
        { name: 'mildlyinteresting', visitors: '6.6M weekly visitors', desc: 'Appreciate the small things in life that are just a little bit interesting.', icon: '💡', bg: '#0284C7' },
        { name: 'interesting', visitors: '6.6M weekly visitors', desc: 'Satisfy your curiosity with a diverse range of fascinating and thought-provoking content.', icon: '✨', bg: '#059669' },
        { name: 'okbuddycinephile', visitors: '5.8M weekly visitors', desc: 'Where cinephiles can come together to share laughs and appreciate the art of film.', icon: '🎭', bg: '#334155' },
        { name: 'TikTokCringe', visitors: '5.9M weekly visitors', desc: 'Laugh out loud at cringy and hilarious TikTok videos and memes.', icon: '📱', bg: '#EC4899' },
        { name: 'popculturechat', visitors: '5.7M weekly visitors', desc: 'Dive into discussions about movies, music, celebrity gossip, and more.', icon: '🍿', bg: '#F43F5E' },
        { name: 'GirlDinnerDiaries', visitors: '5.5M weekly visitors', desc: 'For the feral plates and the feral thoughts. Post your unhinged meals, relationship spirals, late-night...', icon: '🥗', bg: '#F472B6' }
    ],
    'internet-culture': [
        { name: 'memes', visitors: '28M weekly visitors', desc: 'The front page of internet humor and viral memes.', icon: '😂', bg: '#FF4500' },
        { name: 'dankmemes', visitors: '14M weekly visitors', desc: 'Dankest memes on the internet for true meme connoisseurs.', icon: '🔥', bg: '#DC2626' },
        { name: 'wholesomememes', visitors: '11M weekly visitors', desc: 'Memes to make you smile and feel warm inside.', icon: '🥰', bg: '#EC4899' },
        { name: 'PataHaiAajKyaHua', visitors: '441K weekly visitors', desc: 'Spill your small wins, epic fails, and bizarre moments.', icon: '💬', bg: '#7C3AED' },
        { name: 'me_irl', visitors: '9.8M weekly visitors', desc: 'Selfies of the soul and relatable everyday moments.', icon: '🧍', bg: '#2563EB' }
    ],
    'games': [
        { name: 'pesmobile', visitors: '77K weekly visitors', desc: 'Engage in discussions about players, teams, and updates in PES Mobile.', icon: '⚽', bg: '#15803D' },
        { name: 'IndianPCGamers', visitors: '556K weekly visitors', desc: 'PC gaming, builds, news, and memes with Indian gamers.', icon: '🎮', bg: '#FF4500' },
        { name: 'FortniteBR', visitors: '5.6M weekly visitors', desc: 'Official Battle Royale subreddit for Fortnite.', icon: '⚡', bg: '#7E22CE' },
        { name: 'DestinyTheGame', visitors: '3.3M weekly visitors', desc: 'Community for Destiny 2 players and guardians.', icon: '❖', bg: '#0F172A' },
        { name: 'LeagueOfLegends', visitors: '7.2M weekly visitors', desc: 'Esports, highlights, and meta strategy for League of Legends.', icon: '⚔️', bg: '#B45309' }
    ],
    'qa-stories': [
        { name: 'AskReddit', visitors: '17M weekly visitors', desc: 'The go-to subreddit to ask and answer thought-provoking questions.', icon: '🤖', bg: '#0284C7' },
        { name: 'NoStupidQuestions', visitors: '9.5M weekly visitors', desc: 'A judgment-free zone for those curious about anything and everything.', icon: '❓', bg: '#2563EB' },
        { name: 'tifu', visitors: '11.2M weekly visitors', desc: 'Today I F***ed Up - hilarious and embarrassing true personal stories.', icon: '🤦', bg: '#EA580C' },
        { name: 'AmItheAsshole', visitors: '13.5M weekly visitors', desc: 'A cathartic subreddit to judge who is wrong in interpersonal conflicts.', icon: '⚖️', bg: '#059669' }
    ],
    'movies-tv': [
        { name: 'movies', visitors: '6.7M weekly visitors', desc: 'Film enthusiasts unite! Discuss, review, and share your favorite movies.', icon: '🎬', bg: '#DC2626' },
        { name: 'MalayalamMovies', visitors: '148K weekly visitors', desc: 'From cult classics to blockbusters. One-stop destination for Malayalam cinema.', icon: '🎬', bg: '#991B1B' },
        { name: 'kollywood', visitors: '291K weekly visitors', desc: 'Get the latest news and reviews on Tamil movies and TV shows.', icon: '🎥', bg: '#1E3A8A' },
        { name: 'BollyBlindsNGossip', visitors: '1.1M weekly visitors', desc: 'The go-to place for Bollywood enthusiasts to indulge in juicy gossip.', icon: '✨', bg: '#DC2626' },
        { name: 'television', visitors: '4.8M weekly visitors', desc: 'Discussions about TV shows, streaming series, and network news.', icon: '📺', bg: '#7C3AED' }
    ],
    'technology': [
        { name: 'developersIndia', visitors: '424K weekly visitors', desc: 'Tips and tricks for programming and software development with Indian peers.', icon: 'r/', bg: '#FF4500' },
        { name: 'technology', visitors: '14.5M weekly visitors', desc: 'Dedicated to news and discussions about tech innovations and trends.', icon: '💻', bg: '#0D9488' },
        { name: 'gadgets', visitors: '8.2M weekly visitors', desc: 'All about electronic gadgets, smartphone leaks, and hardware reviews.', icon: '📱', bg: '#8B5CF6' },
        { name: 'programming', visitors: '5.1M weekly visitors', desc: 'Computer programming news, articles, and discussions.', icon: '⌨️', bg: '#1E293B' }
    ],
    'places-travel': [
        { name: 'thrissur', visitors: '21K weekly visitors', desc: 'Welcome തൃശൂർ! Dedicated for anything related to Thrissur cultural capital.', icon: '🐘', bg: '#B45309' },
        { name: 'kolkata', visitors: '256K weekly visitors', desc: 'Celebrate the city of joy and Kolkata\'s rich diversity.', icon: '🏛️', bg: '#2563EB' },
        { name: 'bangalore', visitors: '378K weekly visitors', desc: 'Official subreddit for Bangalore, the Silicon Valley of India.', icon: '🌆', bg: '#059669' },
        { name: 'india', visitors: '820K weekly visitors', desc: 'Discover India through discussions on culture, travel, news, and more.', icon: '🇮🇳', bg: '#FF4500' },
        { name: 'travel', visitors: '9.1M weekly visitors', desc: 'Community for travel advice, itineraries, and world destinations.', icon: '✈️', bg: '#0284C7' }
    ],
    'pop-culture': [
        { name: 'popculturechat', visitors: '5.7M weekly visitors', desc: 'Dive into discussions about movies, music, celebrity gossip, and more.', icon: '🍿', bg: '#F43F5E' },
        { name: 'PriyankaChopra', visitors: '3.8K weekly visitors', desc: 'Subreddit dedicated to Priyanka Chopra', icon: '💃', bg: '#831843' },
        { name: 'BollyBlindsNGossip', visitors: '1.1M weekly visitors', desc: 'The go-to place for Bollywood enthusiasts to indulge in juicy gossip.', icon: '✨', bg: '#DC2626' },
        { name: 'TwentiesIndia', visitors: '1.2M weekly visitors', desc: 'A social welcoming space for everyone.', icon: '👥', bg: '#0284C7' }
    ],
    'sports': [
        { name: 'sachintendulkar', visitors: '15M weekly visitors', desc: 'A place to celebrate timeless moments, memories, and all things Sachin Tendulkar.', icon: '🏏', bg: '#B45309' },
        { name: 'Cricket', visitors: '4.5M weekly visitors', desc: 'International and domestic cricket discussion, match threads, and news.', icon: '🏏', bg: '#059669' },
        { name: 'Soccer', visitors: '8.9M weekly visitors', desc: 'Football news, goals, highlights, and match thread discussions.', icon: '⚽', bg: '#16A34A' }
    ],
    'business-finance': [
        { name: 'IndianStockMarket', visitors: '252K weekly visitors', desc: 'Discuss, analyze and share opinions and insights on Indian investments.', icon: '📊', bg: '#D97706' },
        { name: 'CarsIndia', visitors: '527K weekly visitors', desc: 'Stay up to speed on everything related to Indian cars and motorsports.', icon: '🏎️', bg: '#334155' },
        { name: 'PersonalFinance', visitors: '18M weekly visitors', desc: 'Learn to budget, invest, save, and manage your financial future.', icon: '💰', bg: '#059669' }
    ]
};

export function initExplore() {
    const tabsScroll = document.getElementById('exploreTabsScroll');
    const nextBtn = document.getElementById('exploreTabsNextBtn');
    const tabPills = document.querySelectorAll('.explore-tab-pill');
    const categorizedContainer = document.getElementById('exploreCategorizedContainer');
    const filteredContainer = document.getElementById('exploreFilteredContainer');
    const filterTitle = document.getElementById('filterSectionTitle');
    const filteredGrid = document.getElementById('filteredGrid');

    if (nextBtn && tabsScroll) {
        nextBtn.onclick = () => {
            tabsScroll.scrollBy({ left: 240, behavior: 'smooth' });
        };
    }

    tabPills.forEach(pill => {
        pill.onclick = (e) => {
            e.preventDefault();
            tabPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const categoryKey = pill.getAttribute('data-category');
            const categoryLabel = pill.textContent.trim();

            if (categoryKey === 'all') {
                if (categorizedContainer) categorizedContainer.classList.remove('hidden');
                if (filteredContainer) filteredContainer.classList.add('hidden');
            } else {
                if (categorizedContainer) categorizedContainer.classList.add('hidden');
                if (filteredContainer) filteredContainer.classList.remove('hidden');

                if (filterTitle) {
                    filterTitle.textContent = `${categoryLabel} Communities`;
                }

                const list = filterCommunitiesMap[categoryKey] || filterCommunitiesMap['most-visited'];
                if (filteredGrid) {
                    filteredGrid.innerHTML = list.map(item => `
                        <div class="explore-community-card">
                            <div class="community-avatar-circle" style="background-color: ${item.bg}">
                                <span>${item.icon}</span>
                            </div>
                            <div class="community-info-box">
                                <h3 class="community-name-heading">${item.name}</h3>
                                <span class="community-stats-meta">${item.visitors}</span>
                                <p class="community-desc-text">${item.desc}</p>
                            </div>
                            <button class="btn-community-join">Join</button>
                        </div>
                    `).join('');

                    bindJoinButtons(filteredGrid);
                }
            }
        };
    });

    bindJoinButtons(document);

    // Show more button clicks
    document.querySelectorAll('.btn-show-more-category').forEach(btn => {
        btn.onclick = () => {
            showToast('Loading additional communities...');
        };
    });
}

function bindJoinButtons(parent) {
    parent.querySelectorAll('.btn-community-join').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const card = btn.closest('.explore-community-card');
            const name = card?.querySelector('.community-name-heading')?.textContent || 'Community';
            
            if (btn.classList.contains('joined')) {
                btn.classList.remove('joined');
                btn.textContent = 'Join';
            } else {
                btn.classList.add('joined');
                btn.textContent = 'Joined';
            }
        };
    });
}
