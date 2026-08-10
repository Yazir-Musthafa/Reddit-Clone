/**
 * Central State Manager for Pre-Login vs Authenticated State.
 */

const STORAGE_KEY = 'reddit_auth_state';

const defaultState = {
    isLoggedIn: true,
    user: {
        username: 'Fantastic-Series2270',
        karma: 1,
        avatar: 'assets/images/user_avatar.png'
    }
};

class AuthStateManager {
    constructor() {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                this.state = JSON.parse(saved);
            } catch (e) {
                this.state = { ...defaultState };
            }
        } else {
            this.state = { ...defaultState };
        }
        this.listeners = [];
    }

    getState() {
        return this.state;
    }

    login(username = 'Fantastic-Series2270') {
        this.state.isLoggedIn = true;
        this.state.user.username = username;
        this.save();
        this.notify();
    }

    logout() {
        this.state.isLoggedIn = false;
        this.save();
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    save() {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }

    notify() {
        this.listeners.forEach(fn => fn(this.state));
    }
}

export const authState = new AuthStateManager();
