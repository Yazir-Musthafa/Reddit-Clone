/**
 * Demo data so the app isn't empty on first run.
 * Runs automatically when the database has no communities; `npm run seed` wipes and re-seeds.
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('./config');
const User = require('./models/User');
const Community = require('./models/Community');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const { Vote, Draft, Message, Notification, Report, VerificationCode } = require('./models/misc');
const { applyRanks, htmlToText } = require('./utils/helpers');
const { seedCompany } = require('./seed-company');

const DEMO_PASSWORD = 'password123';

const USERS = [
    { username: 'demo_user', email: 'demo@example.com', avatarColor: '#FF87A2', bio: 'Just here for the memes and the mini painting threads.' },
    { username: 'Pixel-Artisan99', email: 'pixel@example.com', avatarColor: '#7193FF', bio: 'Digital artist. Coffee first.' },
    { username: 'Curious-Explorer409', email: 'curious@example.com', avatarColor: '#46D160', bio: 'Travel, trains and street food.' },
    { username: 'Starry-Voyager712', email: 'starry@example.com', avatarColor: '#FFB000', bio: '' },
    { username: 'Cosmic-Dev2026', email: 'cosmic@example.com', avatarColor: '#0079D3', bio: 'Writes code, breaks prod, fixes prod.' },
    { username: 'Bold-Adventurer88', email: 'bold@example.com', avatarColor: '#FF4500', bio: 'Cricket > everything' }
];

// [name, topic, icon, color, members, description]
const COMMUNITIES = [
    ['AskReddit', 'Q&As & Stories', '🤖', '#0284C7', 17000000, 'The go-to subreddit to ask and answer thought-provoking questions.'],
    ['NoStupidQuestions', 'Q&As & Stories', '❓', '#2563EB', 9500000, 'A judgment-free zone for those curious about anything and everything.'],
    ['tifu', 'Q&As & Stories', '🤦', '#EA580C', 11200000, 'Today I messed up: hilarious and embarrassing true personal stories.'],
    ['mildlyinteresting', 'Internet Culture', '💡', '#0284C7', 6600000, 'Appreciate the small things in life that are just a little bit interesting.'],
    ['mildlyinfuriating', 'Internet Culture', '😤', '#EA580C', 12000000, "Find comfort in knowing you're not alone in life's minor irritations."],
    ['memes', 'Internet Culture', '😂', '#FF4500', 28000000, 'The front page of internet humor and viral memes.'],
    ['wholesomememes', 'Internet Culture', '🥰', '#EC4899', 11000000, 'Memes to make you smile and feel warm inside.'],
    ['PataHaiAajKyaHua', 'Internet Culture', '💬', '#7C3AED', 441000, 'Spill your small wins, epic fails, and bizarre moments.'],
    ['minipainting', 'Art', '🖌️', '#0284C7', 1200000, 'Painting miniatures, busts and models. Share your work and techniques.'],
    ['DigitalArt', 'Art', '🎨', '#8B5CF6', 650000, 'A place to share digital art, illustrations and speedpaints.'],
    ['acrylicpainting', 'Art', '🖼️', '#7C3AED', 900000, 'Acrylic painting tips, progress shots and finished pieces.'],
    ['IndianPCGamers', 'Games', '🎮', '#FF4500', 556000, 'PC gaming, builds, news, and memes with Indian gamers.'],
    ['FortniteBR', 'Games', '⚡', '#7E22CE', 5695682, 'Official Battle Royale subreddit for Fortnite.'],
    ['DestinyTheGame', 'Games', '❖', '#0F172A', 3373255, 'Community for Destiny 2 players and guardians.'],
    ['dndnext', 'Games', '&', '#0F172A', 825214, 'Discussion of Dungeons & Dragons fifth edition.'],
    ['anime', 'Anime & Cosplay', '⛩️', '#DB2777', 14376252, 'Reddit\'s premier anime community.'],
    ['movies', 'Movies & TV', '🎬', '#DC2626', 6700000, 'Film enthusiasts unite! Discuss, review, and share your favorite movies.'],
    ['MalayalamMovies', 'Movies & TV', '🎞️', '#991B1B', 148000, 'From cult classics to blockbusters. One-stop destination for Malayalam cinema.'],
    ['kollywood', 'Movies & TV', '🎥', '#1E3A8A', 291000, 'Get the latest news and reviews on Tamil movies and TV shows.'],
    ['technology', 'Technology', '💻', '#0D9488', 14500000, 'Dedicated to news and discussions about tech innovations and trends.'],
    ['programming', 'Technology', '⌨️', '#1E293B', 5100000, 'Computer programming news, articles, and discussions.'],
    ['developersIndia', 'Technology', '🧑‍💻', '#FF4500', 424000, 'Tips and tricks for programming and software development with Indian peers.'],
    ['gadgets', 'Technology', '📱', '#8B5CF6', 8200000, 'All about electronic gadgets, smartphone leaks, and hardware reviews.'],
    ['worldnews', 'News & Politics', '🌍', '#1D4ED8', 40000000, 'A place for major news from around the world.'],
    ['news', 'News & Politics', '📰', '#374151', 28000000, 'Real news articles, primarily but not exclusively about the United States.'],
    ['travel', 'Places & Travel', '✈️', '#0284C7', 9100000, 'Community for travel advice, itineraries, and world destinations.'],
    ['incredibleindia', 'Places & Travel', '🇮🇳', '#059669', 420000, 'Showcasing the beauty and diversity of India.'],
    ['thrissur', 'Places & Travel', '🐘', '#B45309', 21000, 'Anything related to Thrissur, the cultural capital of Kerala.'],
    ['bangalore', 'Places & Travel', '🌆', '#059669', 378000, 'Official subreddit for Bangalore, the Silicon Valley of India.'],
    ['Cricket', 'Sports', '🏏', '#059669', 4500000, 'International and domestic cricket discussion, match threads, and news.'],
    ['soccer', 'Sports', '⚽', '#16A34A', 8900000, 'Football news, goals, highlights, and match thread discussions.'],
    ['personalfinance', 'Business & Finance', '💰', '#059669', 18000000, 'Learn to budget, invest, save, and manage your financial future.'],
    ['IndianStockMarket', 'Business & Finance', '📊', '#D97706', 252000, 'Discuss, analyze and share insights on Indian investments.'],
    ['IndianCooking', 'Food & Drinks', '🍛', '#D97706', 610000, 'Recipes, techniques and photos of Indian home cooking.'],
    ['IndianFashionTalks', 'Fashion & Beauty', '👗', '#EC4899', 190000, 'Fashion, outfits and style advice.'],
    ['popculturechat', 'Pop Culture', '🍿', '#F43F5E', 5700000, 'Dive into discussions about movies, music, celebrity gossip, and more.'],
    ['Music', 'Music', '🎶', '#9333EA', 32000000, 'The musical community of reddit.'],
    ['EarthPorn', 'Nature & Outdoors', '🏔️', '#15803D', 23000000, 'Beautiful high-resolution images of the natural world.'],
    ['science', 'Sciences', '🧪', '#0369A1', 32000000, 'Discussion of new peer-reviewed research.'],
    ['books', 'Reading & Writing', '📚', '#92400E', 25000000, 'The goal of r/books is to foster discussion about books.'],
    ['Fitness', 'Wellness', '🏋️', '#DC2626', 11000000, 'A place for fitness-related discussion, questions and routines.'],
    ['pics', 'Internet Culture', '📷', '#EC4899', 30000000, 'A place for photographs, pictures, and other images.'],
    ['funny', 'Internet Culture', '🤣', '#F59E0B', 55000000, 'Welcome to r/funny, Reddit\'s largest humour depository.']
];

// [community, authorIndex, hoursAgo, score, title, { body, media, url, tags }]
const POSTS = [
    ['minipainting', 1, 96, 3012, "Jeanne D'Arc finished bust :)", { media: ['post_jeanne_darc.png'], tags: ['OC'], body: '<p>Took me about three weeks. Mostly Vallejo paints, the armour is NMM (non-metallic metal). Happy to answer questions!</p>' }],
    ['DigitalArt', 1, 90, 1304, 'Ice cream in my style', { media: ['post_ice_cream.png'], tags: ['OC'] }],
    ['PataHaiAajKyaHua', 3, 8, 841, 'MY DAD SENT MY SCHOOL TEACHER GOOD MORNING TEXT😭🙏', { media: ['post_barbie_meme.png', 'post_barbie_shocked.png'] }],
    ['IndianFashionTalks', 2, 20, 522, 'Party outfit check — thoughts?', { media: ['post_fashion_party.png'], tags: ['Discussion'] }],
    ['AskReddit', 4, 5, 2210, "What's a small habit that genuinely improved your life?", { body: '<p>Mine is putting my phone in another room an hour before bed. Sleep is so much better.</p>', tags: ['Discussion'] }],
    ['programming', 4, 30, 1780, 'I finally understand why everyone says "naming things is hard"', { body: '<p>Spent 40 minutes today deciding between <code>getUserData</code>, <code>fetchUser</code> and <code>loadProfile</code>. Send help.</p>' }],
    ['developersIndia', 4, 14, 640, 'How do you prepare for system design interviews as a fresher?', { body: '<p>I have 6 months before placements. Any structured roadmap or resources that worked for you?</p>', tags: ['Advice'] }],
    ['IndianPCGamers', 5, 26, 902, "What's that game according to you?", { body: '<p>The one game you can always come back to, no matter how many years pass.</p>', tags: ['Discussion'] }],
    ['incredibleindia', 2, 100, 1210, 'my kind of beauty..', { body: '<p>Early morning mist over the backwaters. No filter.</p>' }],
    ['travel', 2, 40, 760, 'Two weeks in Kerala on a budget — full itinerary inside', { body: '<p><b>Days 1-3:</b> Kochi<br><b>Days 4-6:</b> Munnar<br><b>Days 7-9:</b> Alleppey houseboat<br><b>Days 10-14:</b> Varkala beach.</p><p>Total spend was around ₹38,000 including trains.</p>', tags: ['Advice'] }],
    ['Cricket', 5, 3, 1450, 'That last over was absolutely unreal', { body: '<p>Needing 14 off 6 and they did it with a ball to spare. What a finish.</p>', tags: ['Discussion'] }],
    ['technology', 4, 12, 2890, 'New study finds most people keep their smartphones for over three years now', { url: 'https://en.wikipedia.org/wiki/Smartphone', tags: ['News'] }],
    ['worldnews', 3, 6, 5120, 'Wildfire season starts early as heatwave grips several regions', { url: 'https://en.wikipedia.org/wiki/Wildfire', tags: ['News'] }],
    ['news', 3, 9, 3310, 'City council approves a 120 km protected bike lane network', { url: 'https://en.wikipedia.org/wiki/Segregated_cycle_facilities', tags: ['News'] }],
    ['movies', 5, 16, 1980, 'Directors keep arguing physical media is safer than streaming. Do you still buy discs?', { url: 'https://en.wikipedia.org/wiki/Blu-ray', tags: ['Discussion'] }],
    ['personalfinance', 0, 48, 870, 'Built my first emergency fund — 6 months of expenses saved!', { body: '<p>Took two years of automatic transfers on payday. If you are starting out: automate it and forget it.</p>' }],
    ['IndianCooking', 2, 50, 160, 'Lunch', { body: '<p>Rice, sambar, cabbage thoran and a fried pappadam. Simple and perfect.</p>' }],
    ['wholesomememes', 0, 2, 430, 'My grandma learned to send memes and now she only sends me memes', { body: '<p>She sent 14 today. I love her.</p>' }],
    ['science', 4, 70, 4100, 'Researchers map the most detailed 3D model of a fruit fly brain yet', { url: 'https://en.wikipedia.org/wiki/Connectome', tags: ['News'] }],
    ['books', 2, 60, 1120, 'What book made you fall in love with reading again?', { body: '<p>For me it was <i>The Name of the Wind</i> after a three-year slump.</p>', tags: ['Discussion'] }]
];

// [postIndex, authorIndex, body, replies[]]
const COMMENTS = [
    [0, 2, 'The NMM on the armour is incredible. How long did the cape take?', [[1, 'Cape was about 4 evenings, lots of thin glazes!', [[2, 'Glazes are the secret to everything honestly']]]]],
    [0, 4, 'Saving this for reference, thank you for sharing.', []],
    [2, 0, 'This is the funniest thing I have read all week 😭', [[3, 'He meant well!! Teacher replied with a thumbs up apparently']]],
    [4, 1, 'Drinking a glass of water right after waking up. Sounds dumb, works great.', [[5, 'Not dumb at all, I do the same']]],
    [4, 2, 'Walking 20 minutes after dinner. Digestion and mood both improved.', []],
    [5, 1, 'The two hard problems: cache invalidation, naming things, and off-by-one errors.', [[4, 'Classic. Take my upvote.']]],
    [6, 5, 'Start with the basics: load balancers, caching, databases, queues. Then practice designing common systems out loud.', []],
    [10, 3, 'I was screaming at my TV. Best match of the season.', []],
    [11, 0, 'Still using my phone from 2021 and it runs fine.', []],
    [15, 4, 'Congrats! That is a huge milestone.', [[0, 'Thank you! It feels great to have that buffer.']]]
];

async function seed({ force = false } = {}) {
    if (!force && (await Community.estimatedDocumentCount()) > 0) return false;
    if (force) {
        await Promise.all([User, Community, Post, Comment, Vote, Draft, Message, Notification, Report, VerificationCode]
            .map(M => M.deleteMany({})));
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const users = await User.insertMany(USERS.map(u => ({
        ...u, usernameLower: u.username.toLowerCase(), passwordHash, createdAt: new Date(Date.now() - 400 * 86400000)
    })));

    const communities = await Community.insertMany(COMMUNITIES.map(([name, topic, icon, color, members, description], i) => ({
        name, nameLower: name.toLowerCase(), topic, icon, color, description,
        bannerColor: color,
        memberCount: members,
        creator: users[i % users.length]._id,
        moderators: [users[i % users.length]._id],
        rules: [
            { title: 'Be respectful', description: 'Treat others the way you would like to be treated.' },
            { title: 'No spam or self-promotion', description: 'Limit self-promotion to 10% of your activity.' },
            { title: 'Stay on topic', description: `Posts must be relevant to r/${name}.` }
        ],
        createdAt: new Date(Date.now() - (2000 + i * 30) * 86400000)
    })));
    const byName = new Map(communities.map(c => [c.name, c]));

    // demo_user starts in a handful of communities so the home feed is personalised.
    const demoJoins = ['minipainting', 'DigitalArt', 'PataHaiAajKyaHua', 'AskReddit', 'programming', 'technology', 'travel', 'wholesomememes'];
    await User.updateOne({ _id: users[0]._id }, { joinedCommunities: demoJoins.map(n => byName.get(n)._id) });

    const posts = POSTS.map(([community, authorIdx, hoursAgo, score, title, extra]) => {
        const post = new Post({
            title,
            body: extra.body || '',
            bodyText: htmlToText(extra.body || ''),
            url: extra.url || '',
            media: (extra.media || []).map(file => ({ type: 'image', url: `/assets/images/${file}` })),
            tags: extra.tags || [],
            author: users[authorIdx]._id,
            community: byName.get(community)._id,
            score,
            upvotes: Math.round(score * 1.1),
            downvotes: Math.round(score * 0.1),
            createdAt: new Date(Date.now() - hoursAgo * 3600000)
        });
        return post;
    });

    const comments = [];
    const addComment = (post, authorIdx, body, parent, minutesAfter) => {
        const c = new Comment({
            post: post._id, author: users[authorIdx]._id, parent: parent?._id || null, body,
            score: 1 + Math.floor(Math.random() * 120),
            createdAt: new Date(post.createdAt.getTime() + minutesAfter * 60000)
        });
        comments.push(c);
        post.commentCount += 1;
        return c;
    };
    const addTree = (post, [authorIdx, body, replies = []], parent, depth) => {
        const c = addComment(post, authorIdx, body, parent, 30 * (depth + 1));
        replies.forEach(r => addTree(post, r, c, depth + 1));
    };
    COMMENTS.forEach(([postIdx, authorIdx, body, replies]) => addTree(posts[postIdx], [authorIdx, body, replies], null, 0));

    posts.forEach(applyRanks);
    await Post.insertMany(posts);
    await Comment.insertMany(comments);

    // Karma roughly reflects the seeded scores.
    for (const [i, u] of users.entries()) {
        const postKarma = posts.filter(p => p.author.equals(u._id)).reduce((s, p) => s + p.score, 0);
        const commentKarma = comments.filter(c => c.author.equals(u._id)).reduce((s, c) => s + c.score, 0);
        await User.updateOne({ _id: u._id }, { postKarma, commentKarma, bio: USERS[i].bio });
    }

    await Message.insertMany([
        { from: users[1]._id, to: users[0]._id, text: 'Hey! Loved your comment on the bust post.', createdAt: new Date(Date.now() - 3600000) },
        { from: users[0]._id, to: users[1]._id, text: 'Thanks! Your digital art is amazing too.', createdAt: new Date(Date.now() - 3500000), readAt: new Date() }
    ]);

    console.log(`[seed] Inserted ${users.length} users, ${communities.length} communities, ${posts.length} posts, ${comments.length} comments.`);
    console.log(`[seed] Demo login: demo_user / ${DEMO_PASSWORD}`);
    return true;
}

module.exports = { seed };

if (require.main === module) {
    mongoose.connect(config.mongoUri)
        .then(async () => {
            const force = process.argv.includes('--force');
            const done = await seed({ force });
            await seedCompany({ force });
            return done;
        })
        .then(done => { if (!done) console.log('[seed] Database already has data. Use --force to reset.'); })
        .catch(err => { console.error(err); process.exitCode = 1; })
        .finally(() => mongoose.disconnect());
}
