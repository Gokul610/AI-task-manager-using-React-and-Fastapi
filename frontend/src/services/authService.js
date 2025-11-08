// frontend/src/services/authService.js

import apiClient from './api';

// --- NEW SERVICE FOR GOOGLE-ONLY AUTH & TOKEN MANAGEMENT ---
const authService = {
  
  /**
   * Checks the user's login status by checking local storage for the access token.
   * NOTE: The token might be expired, but the API interceptor handles the silent refresh.
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  /**
   * Checks the user's status with the backend to see if they need to finalize signup.
   * This is used by GoogleCallbackPage.jsx.
   * @returns {Promise<object>} - Returns the user object with the 'has_finalized_signup' status.
   */
  getCurrentUserStatus: async () => {
    // We hit a simple, protected endpoint (like reading user info)
    // to check the token and get the user's current status.
    // The backend's new auth_router should have a /auth/me endpoint for this purpose.
    const response = await apiClient.get('/auth/me'); 
    return response.data;
  },

  /**
   * Finalizes the signup process after the user agrees to terms.
   * @param {boolean} acceptsTerms - Should always be true.
   */
  finalizeSignup: async (acceptsTerms) => {
    const response = await apiClient.post('/auth/google/finalize-signup', {
      accepts_terms: acceptsTerms,
    });
    // The backend flips the 'has_finalized_signup' flag to true.
    return response.data;
  },

  /**
   * Logs out the user by telling the backend to revoke the long-lived refresh token
   * and clearing the local access token.
   */
  logout: async () => {
    try {
      // 1. Tell the backend to revoke the refresh token (clear the HttpOnly cookie)
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error("Logout error (likely already logged out on server):", error);
    }
    // 2. Clear the short-lived access token from local storage
    localStorage.removeItem('authToken');
  },
};

export default authService;