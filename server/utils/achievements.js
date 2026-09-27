const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Community = require('../models/Community');

async function computeAchievements(user) {
    const [posts, comments, created] = await Promise.all([
        Post.countDocuments({ author: user._id, removed: false }),
        Comment.countDocuments({ author: user._id, deleted: false }),
        Community.countDocuments({ creator: user._id })
    ]);
    const karma = user.postKarma + user.commentKarma;
    const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / 86400000;

    const list = [
        { id: 'joined', icon: '🎉', name: 'Welcome Aboard', description: 'Created a Reddit account', unlocked: true },
        { id: 'first-post', icon: '📝', name: 'First Post', description: 'Published your first post', unlocked: posts >= 1 },
        { id: 'first-comment', icon: '💬', name: 'Conversationalist', description: 'Left your first comment', unlocked: comments >= 1 },
        { id: 'joiner', icon: '🧭', name: 'Community Explorer', description: 'Joined 3 or more communities', unlocked: user.joinedCommunities.length >= 3 },
        { id: 'founder', icon: '🏗️', name: 'Founder', description: 'Started a community', unlocked: created >= 1 },
        { id: 'karma-10', icon: '⬆️', name: 'Rising Star', description: 'Earned 10 karma', unlocked: karma >= 10 },
        { id: 'karma-100', icon: '🌟', name: 'Popular Voice', description: 'Earned 100 karma', unlocked: karma >= 100 },
        { id: 'prolific', icon: '✍️', name: 'Prolific Poster', description: 'Published 10 posts', unlocked: posts >= 10 },
        { id: 'week', icon: '📅', name: 'One Week Club', description: 'Account is at least a week old', unlocked: ageDays >= 7 },
        { id: 'profile', icon: '🎨', name: 'Personal Touch', description: 'Added a bio to your profile', unlocked: !!user.bio }
    ];
    return { list, unlocked: list.filter(a => a.unlocked).length, stats: { posts, comments, created } };
}

module.exports = { computeAchievements };
