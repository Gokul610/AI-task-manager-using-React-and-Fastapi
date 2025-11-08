// frontend/src/services/api.js

import axios from 'axios';

// --- Create a central Axios instance ---
const apiClient = axios.create({
  // All requests will be sent to our backend
  baseURL: 'http://localhost:8000', 
  // IMPORTANT: We must send cookies for the refresh token
  withCredentials: true, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- 1. Request Interceptor (Unchanged) ---
// This runs *before* every request to attach the current Access Token.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- 2. Response Interceptor (THE CRITICAL FIX) ---
// This runs *after* every response to handle expired tokens (401).
apiClient.interceptors.response.use(
  (response) => response, // If the response is good, just pass it through

  async (error) => {
    const originalRequest = error.config;
    
    // Check for the expired token condition:
    // 1. Status is 401 (Unauthorized).
    // 2. We have not already tried to refresh the token for this request.
    // 3. The request is NOT the refresh-token endpoint itself (to avoid infinite loops).
    if (
        error.response && 
        error.response.status === 401 && 
        !originalRequest._retry &&
        originalRequest.url !== '/auth/refresh-token'
    ) {
      originalRequest._retry = true; // Mark as retried
      
      try {
        // A. Silently call the backend to exchange the Refresh Token for a new Access Token.
        const refreshResponse = await axios.post(
            'http://localhost:8000/auth/refresh-token', 
            {}, 
            { withCredentials: true } // Must send the cookie!
        );
        
        const newAccessToken = refreshResponse.data.access_token;

        if (!newAccessToken) {
          // If the backend didn't send a token, the Refresh Token is invalid or revoked.
          throw new Error('No new access token provided.');
        }

        // B. Save the new token locally and update the Authorization header
        localStorage.setItem('authToken', newAccessToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        
        // C. Retry the original failed request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        // If the refresh fails (401 or network error), the session is truly over.
        console.error('Persistent session failed. Forcing logout.', refreshError);
        localStorage.removeItem('authToken');
        // Redirect to the login page (root route)
        window.location.href = '/'; 
        return Promise.reject(refreshError);
      }
    }

    // Reject all other errors (including the initial 401 if we already tried to refresh)
    return Promise.reject(error);
  }
);

export default apiClient;