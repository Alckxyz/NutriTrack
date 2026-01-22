import * as FB from './firebase-config.js';
import { state, loadUserData } from './state.js';

export function initAuth(refreshUI) {
    FB.onAuthStateChanged(FB.auth, (user) => {
        if (user) {
            loadUserData(user, refreshUI);
        } else {
            state.user = null;
            refreshUI();
        }
    });
}

export async function login() {
    try {
        await FB.signInWithPopup(FB.auth, FB.provider);
    } catch (error) {
        console.error("Login failed:", error);
    }
}

export async function logout(refreshUI) {
    await FB.signOut(FB.auth);
    state.user = null;
    refreshUI();
}

export function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');

    if (state.user) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userProfile) userProfile.classList.remove('hidden');
        if (userAvatar) userAvatar.src = state.user.photoURL || `https://images.websim.com/avatar/${state.user.displayName}`;
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userProfile) userProfile.classList.add('hidden');
    }
}