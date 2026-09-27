/**
 * Session state, backed by the server's /api/auth/me endpoint.
 */
import { api } from './api.js';

class AuthStateManager {
    constructor() {
        this.state = { isLoggedIn: false, user: null, loaded: false };
        this.listeners = [];
        this.loading = null;
    }

    load() {
        if (!this.loading) {
            this.loading = api.get('/auth/me')
                .then(({ user }) => this.setUser(user))
                .catch(() => this.setUser(null));
        }
        return this.loading;
    }

    async refresh() {
        const { user } = await api.get('/auth/me');
        this.setUser(user);
        return user;
    }

    getState() {
        return this.state;
    }

    get user() {
        return this.state.user;
    }

    setUser(user) {
        this.state = { isLoggedIn: !!user, user: user || null, loaded: true };
        this.notify();
    }

    /** Called after a successful login/signup: reload so every component re-renders as the new user. */
    completeLogin() {
        window.location.reload();
    }

    async logout() {
        try {
            await api.post('/auth/logout');
        } finally {
            window.location.href = 'index.html';
        }
    }

    isJoined(communityName) {
        const name = String(communityName || '').toLowerCase();
        return !!this.state.user?.joinedCommunities?.some(c => c.name.toLowerCase() === name);
    }

    /** Keeps the cached joined list in sync after a join/leave without refetching. */
    markJoined(community, joined) {
        const user = this.state.user;
        if (!user) return;
        user.joinedCommunities = user.joinedCommunities.filter(c => c.name.toLowerCase() !== community.name.toLowerCase());
        if (joined) user.joinedCommunities.push({ id: community.id, name: community.name, icon: community.icon, color: community.color });
        user.joinedCommunities.sort((a, b) => a.name.localeCompare(b.name));
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(fn => fn(this.state));
    }
}

export const authState = new AuthStateManager();
