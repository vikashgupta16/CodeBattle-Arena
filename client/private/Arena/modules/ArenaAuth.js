/**
 * ArenaAuth.js - Authentication and user management
 */

class ArenaAuth {
    constructor() {
        // Auth-related properties
    }

    async getCurrentUser() {
        try {
            // Check if user is signed in with Clerk (same pattern as coder.js)
            if (typeof Clerk !== 'undefined' && Clerk.user) {
                
                // Now fetch additional user data from our API
                try {
                    const response = await fetch('/api/userdata');

                    if (response.ok) {
                        const data = await response.json();
                        
                        // Map API response fields to Arena expected format
                        return {
                            userId: data.userId || Clerk.user.id,
                            username: data.name || data.username || Clerk.user.username || Clerk.user.firstName || 'User',
                            name: data.name || data.username || Clerk.user.firstName || 'User',
                            email: data.email || Clerk.user.primaryEmailAddress?.emailAddress,
                            ...data // Include all other fields from API
                        };
                    } else {
                        // Return basic user info from Clerk if API fails
                        return {
                            userId: Clerk.user.id,
                            username: Clerk.user.username || Clerk.user.firstName || 'User',
                            email: Clerk.user.primaryEmailAddress?.emailAddress
                        };
                    }
                } catch (apiError) {
                    console.warn('API call failed, using Clerk user data:', apiError);
                    // Return basic user info from Clerk if API fails
                    return {
                        userId: Clerk.user.id,
                        username: Clerk.user.username || Clerk.user.firstName || 'User',
                        email: Clerk.user.primaryEmailAddress?.emailAddress
                    };
                }
            } else {
                return null;
            }
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    redirectToSignIn() {
        window.location.href = '../../public/Accounts/signin.html';
    }

    isAuthenticated() {
        return !!Clerk.user;
    }

    getUserId() {
        return Clerk.user?.id || null;
    }

    getUsername() {
        return Clerk.user?.username || 'Unknown User';
    }
}

window.ArenaAuth = ArenaAuth;
