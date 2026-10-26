import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { authState } from '../js/auth-state.js';

const AuthContext = createContext(null);
const subscribe = listener => authState.subscribe(listener);
const getSnapshot = () => authState.getState();

// Template regions have their own React roots. Each provider subscribes to the
// same session store so every tree receives the same current session snapshot.
export function AuthProvider({ children }) {
    const session = useSyncExternalStore(subscribe, getSnapshot);
    return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const session = useContext(AuthContext);
    if (!session) throw new Error('useAuth must be used inside AuthProvider');
    return session;
}
