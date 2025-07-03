// Authentication utility for frontend
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.checkAuthStatus();
    }

    async checkAuthStatus() {
        try {
            // Check if Clerk is loaded and user is signed in
            if (typeof Clerk !== 'undefined' && Clerk.user) {
                this.isAuthenticated = true;
                this.user = Clerk.user;
                this.updateUI();
            } else {
                this.isAuthenticated = false;
                this.user = null;
                this.updateUI();
            }
        } catch (error) {
            console.log('Auth check failed:', error);
            this.isAuthenticated = false;
            this.user = null;
            this.updateUI();
        }
    }

    updateUI() {
        // Update authentication-dependent UI elements
        const authElements = document.querySelectorAll('[data-auth-required]');
        const guestElements = document.querySelectorAll('[data-guest-only]');
        
        authElements.forEach(el => {
            if (this.isAuthenticated) {
                el.style.display = el.dataset.originalDisplay || 'block';
            } else {
                el.dataset.originalDisplay = el.style.display;
                el.style.display = 'none';
            }
        });

        guestElements.forEach(el => {
            if (!this.isAuthenticated) {
                el.style.display = el.dataset.originalDisplay || 'block';
            } else {
                el.dataset.originalDisplay = el.style.display;
                el.style.display = 'none';
            }
        });

        // Update user info if elements exist
        const userNameElements = document.querySelectorAll('[data-user-name]');
        userNameElements.forEach(el => {
            if (this.user?.firstName) {
                el.textContent = this.user.firstName;
            }
        });
    }

    redirectToSignIn(returnUrl = null) {
        const url = returnUrl ? 
            `/public/Accounts/signin.html?returnUrl=${encodeURIComponent(returnUrl)}` :
            '/public/Accounts/signin.html';
        window.location.href = url;
    }

    showGuestMessage() {
        return {
            type: 'info',
            message: '🎯 Sign in to save your progress and unlock all features!',
            action: {
                text: 'Sign In',
                handler: () => this.redirectToSignIn(window.location.pathname + window.location.search)
            }
        };
    }
}

// Initialize global auth manager
window.authManager = new AuthManager();

// Re-check auth status when Clerk loads
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Clerk !== 'undefined') {
        Clerk.addListener('user', () => {
            window.authManager.checkAuthStatus();
        });
    }
});
