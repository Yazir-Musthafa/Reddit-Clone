import { openAuthModal } from '../../js/interactions.js';
import { toggleChatsModal } from '../chats/chats.js';
import { authState } from '../../js/auth-state.js';

export function initHeader() {
    const signupBtn = document.getElementById('headerSignupBtn');
    const loginBtn = document.getElementById('headerLoginBtn');
    const moreBtn = document.getElementById('headerMoreBtn');
    const moreDropdown = document.getElementById('moreDropdown');
    const chatBtn = document.getElementById('headerChatBtn');
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const profileLogoutBtn = document.getElementById('profileLogoutBtn');
    const dropdownUsername = document.getElementById('dropdownUsername');

    const state = authState.getState();
    if (dropdownUsername && state?.user?.username) {
        dropdownUsername.textContent = `u/${state.user.username}`;
    }

    if (signupBtn) {
        signupBtn.onclick = () => {
            openAuthModal('Sign Up');
        };
    }

    if (loginBtn) {
        loginBtn.onclick = () => {
            openAuthModal('Log In');
        };
    }

    if (chatBtn) {
        chatBtn.onclick = (e) => {
            e.stopPropagation();
            toggleChatsModal();
        };
    }

    if (moreBtn && moreDropdown) {
        moreBtn.onclick = (e) => {
            e.stopPropagation();
            moreDropdown.classList.toggle('hidden');
        };
    }

    // Profile Dropdown Toggle
    if (userProfileBtn && profileDropdown) {
        userProfileBtn.onclick = (e) => {
            e.stopPropagation();
            // Close more dropdown if open
            if (moreDropdown) moreDropdown.classList.add('hidden');
            profileDropdown.classList.toggle('hidden');
            userProfileBtn.setAttribute('aria-expanded', !profileDropdown.classList.contains('hidden'));
        };

        profileDropdown.onclick = (e) => {
            e.stopPropagation();
        };
    }

    if (profileLogoutBtn) {
        profileLogoutBtn.onclick = (e) => {
            e.preventDefault();
            if (profileDropdown) profileDropdown.classList.add('hidden');
            authState.logout();
        };
    }

    // Global Document Click Handler to close open dropdowns
    document.addEventListener('click', (e) => {
        if (moreBtn && moreDropdown && !moreBtn.contains(e.target) && !moreDropdown.contains(e.target)) {
            moreDropdown.classList.add('hidden');
        }
        if (userProfileBtn && profileDropdown && !userProfileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.add('hidden');
            userProfileBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

