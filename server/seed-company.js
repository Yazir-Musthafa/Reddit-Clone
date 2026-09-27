/**
 * Careers and Press content. Seeded on startup when the collections are empty,
 * so existing databases pick it up without losing their other data.
 */
const { Job, JobApplication, PressRelease, PressInquiry } = require('./models/company');

const JOBS = [
    {
        title: 'Senior Backend Engineer, Feeds', department: 'Engineering', location: 'San Francisco, CA', remote: true,
        summary: 'Build the ranking and delivery systems behind Home, Popular and custom feeds.',
        responsibilities: ['Design and scale the services that assemble feeds for every user', 'Improve Best, Hot and Rising ranking quality', 'Own performance, reliability and on-call for feed services'],
        requirements: ['5+ years building backend services (Node.js, Go or similar)', 'Experience with MongoDB or other document stores at scale', 'Comfort with caching, queues and observability tooling']
    },
    {
        title: 'Frontend Engineer, Web', department: 'Engineering', location: 'New York, NY', remote: true,
        summary: 'Craft fast, accessible experiences for millions of redditors on the web.',
        responsibilities: ['Build UI for posts, comments and communities', 'Raise the bar on accessibility and performance', 'Partner closely with design and product'],
        requirements: ['3+ years of modern JavaScript, HTML and CSS', 'A keen eye for detail and interaction design', 'Experience testing UIs end to end']
    },
    {
        title: 'Site Reliability Engineer', department: 'Engineering', location: 'Bengaluru, India', remote: false,
        summary: 'Keep the front page of the internet up, fast and secure.',
        responsibilities: ['Run and automate our production infrastructure', 'Lead incident response and blameless postmortems', 'Build tooling for safe, frequent deploys'],
        requirements: ['Experience with Linux, containers and cloud providers', 'Strong scripting skills', 'A calm head during incidents']
    },
    {
        title: 'Product Designer, Communities', department: 'Design', location: 'Remote', remote: true,
        summary: 'Design the tools moderators and members use to build thriving communities.',
        responsibilities: ['Own end-to-end design for community creation and mod tools', 'Run research with moderators', 'Prototype and test ideas quickly'],
        requirements: ['A portfolio showing product design for complex tools', 'Strong interaction and visual design skills', 'Experience working with engineers daily']
    },
    {
        title: 'Community Safety Specialist', department: 'Trust & Safety', location: 'Dublin, Ireland', remote: false,
        summary: 'Help keep communities safe by reviewing reports and shaping policy.',
        responsibilities: ['Review reported content against the Reddit Rules', 'Support moderators with escalations', 'Spot abuse trends and feed them into tooling'],
        requirements: ['Excellent judgement and written communication', 'Resilience when handling difficult content', 'Experience in content moderation is a plus']
    },
    {
        title: 'Community Manager, India', department: 'Community', location: 'Bengaluru, India', remote: true,
        summary: 'Support and grow communities across India and South Asia.',
        responsibilities: ['Partner with moderators of fast-growing communities', 'Run events, AMAs and programs', 'Bring community feedback to product teams'],
        requirements: ['Deep familiarity with Reddit culture', 'Fluency in English plus one Indian language', 'Great organisational skills']
    },
    {
        title: 'Data Scientist, Growth', department: 'Data', location: 'Toronto, Canada', remote: true,
        summary: 'Turn product data into decisions that help new users find their home on Reddit.',
        responsibilities: ['Design and analyse experiments', 'Build metrics and dashboards for onboarding', 'Partner with product managers on strategy'],
        requirements: ['Strong SQL and Python', 'Experience running A/B tests', 'Clear communication of results to non-experts']
    },
    {
        title: 'Software Engineering Intern (Summer)', department: 'Engineering', location: 'San Francisco, CA', remote: false, type: 'Internship',
        summary: 'Spend 12 weeks shipping real features with a mentor on a product team.',
        responsibilities: ['Ship a project end to end', 'Participate in code review and planning', 'Present your work to the company'],
        requirements: ['Currently studying computer science or a related field', 'Some experience with web or backend development', 'Curiosity and eagerness to learn']
    }
].map(j => ({ ...j, slug: j.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }));

const RELEASES = [
    {
        title: 'Reddit Clone launches with communities, feeds and threaded discussion', category: 'Product', daysAgo: 60,
        summary: 'A full-stack Reddit clone built with vanilla JavaScript, Node.js and MongoDB opens its doors.',
        body: `<p>Today the Reddit Clone project launched its first public version: a full-stack recreation of the Reddit experience built with plain HTML, CSS and JavaScript on the frontend and Node.js, Express and MongoDB on the backend.</p>
            <p>At launch, people can create accounts, join and create communities, publish text, link, image and video posts, vote, and hold threaded conversations in the comments.</p>
            <h2>Highlights</h2>
            <ul><li>Home, Popular, News and All feeds, sorted by Best, Hot, New, Top or Rising</li><li>Community moderation tools, rules and approved users</li><li>Karma, achievements and user profiles</li></ul>`
    },
    {
        title: 'Custom feeds let redditors combine their favourite communities', category: 'Product', daysAgo: 30,
        summary: 'A new way to follow a hand-picked mix of communities in a single feed.',
        body: `<p>Custom feeds are now available to everyone. Pick any communities you like, give the feed a name, and it appears in your sidebar with posts from just those communities.</p>
            <p>Feeds can be edited or deleted at any time, and support the same sorting and layout options as the Home feed.</p>`
    },
    {
        title: 'Chat and notifications arrive', category: 'Product', daysAgo: 14,
        summary: 'Redditors can now message each other directly and get notified about replies.',
        body: `<p>The new chat panel lets redditors start one-to-one conversations from the header or from any profile. Unread counts show on the chat icon.</p>
            <p>Notifications alert people when someone comments on their post, replies to their comment, messages them, or grants them moderator access.</p>`
    },
    {
        title: 'Strengthening safety with reporting and private communities', category: 'Safety', daysAgo: 7,
        summary: 'New reporting flows and community types give moderators more control.',
        body: `<p>Every post and comment can now be reported for breaking the Reddit Rules. Communities can be Public, Restricted (only approved users post) or Private (only approved users can view), and can be marked as 18+.</p>
            <p>Moderators manage approved users and co-moderators from the new Mod Tools panel on their community page.</p>`
    },
    {
        title: 'Reddit Clone opens hiring for engineering, design and safety roles', category: 'Company', daysAgo: 2,
        summary: 'The team is growing across engineering, design, community and trust & safety.',
        body: `<p>We are hiring across several teams, with remote-friendly roles in engineering, design, data and community.</p>
            <p>See every open role and apply online on our <a href="careers.html">Careers</a> page.</p>`
    }
].map(r => ({
    ...r,
    slug: r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    publishedAt: new Date(Date.now() - r.daysAgo * 86400000)
}));

async function seedCompany({ force = false } = {}) {
    if (force) {
        await Promise.all([Job, JobApplication, PressRelease, PressInquiry].map(M => M.deleteMany({})));
    }
    let inserted = false;
    if ((await Job.estimatedDocumentCount()) === 0) {
        await Job.insertMany(JOBS);
        inserted = true;
    }
    if ((await PressRelease.estimatedDocumentCount()) === 0) {
        await PressRelease.insertMany(RELEASES.map(({ daysAgo, ...r }) => r));
        inserted = true;
    }
    if (inserted) console.log(`[seed] Careers and press content ready (${JOBS.length} jobs, ${RELEASES.length} press releases).`);
}

module.exports = { seedCompany };
