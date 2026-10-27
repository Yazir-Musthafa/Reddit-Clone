/** Pure updates: the original post/props are never mutated. */
export function postReducer(post, action) {
    switch (action.type) {
        case 'vote': return { ...post, score: post.score + action.direction - post.userVote, userVote: action.direction };
        case 'patch': return { ...post, ...action.changes };
        default: return post;
    }
}
