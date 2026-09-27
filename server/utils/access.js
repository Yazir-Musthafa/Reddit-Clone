const Community = require('../models/Community');

function isMember(list, user) {
    return !!user && (list || []).some(id => String(id._id || id) === String(user._id));
}

function canView(community, user) {
    if (community.type !== 'Private') return true;
    return isMember(community.moderators, user) || isMember(community.approvedUsers, user);
}

function canPost(community, user) {
    if (!user) return false;
    if (community.type === 'Public') return true;
    return isMember(community.moderators, user) || isMember(community.approvedUsers, user);
}

/** Community ids whose posts must be kept out of mixed feeds for this viewer. */
async function hiddenCommunityIds(user) {
    const privateOnes = await Community.find({ type: 'Private' }).select('type moderators approvedUsers').lean();
    const blocked = privateOnes.filter(c => !canView(c, user)).map(c => c._id);
    if (!user?.prefs?.showMature) {
        const mature = await Community.find({ mature: true }).distinct('_id');
        blocked.push(...mature);
    }
    return blocked;
}

module.exports = { canView, canPost, hiddenCommunityIds, isMember };
