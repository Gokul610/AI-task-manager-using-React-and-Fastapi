// frontend/src/pages/GoogleCallbackPage.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import Button from '../components/ui/Button'; // <-- THE FIX: Added Button import

const GoogleCallbackPage = () => {
  const [status, setStatus] = useState('Verifying your account...');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const query = new URLSearchParams(location.search);
      const token = query.get('token'); // Our short-lived access token
      const errorCode = query.get('error'); 

      if (errorCode) {
        // If Google sends back an error (e.g., user denied permission)
        setError(`Login failed: ${errorCode}. Please try again.`);
        return;
      }
      
      if (!token) {
        // The token should always be present after a successful backend exchange
        setError('Login failed: Token not found in callback URL.');
        return;
      }

      // 1. Save the short-lived access token
      localStorage.setItem('authToken', token);

      // 2. Determine next destination (Finalize Signup or Dashboard)
      
      try {
        setStatus('Checking signup status...');
        
        // --- Manual Check of User State ---
        // This endpoint will return the user's data, including the has_finalized_signup flag
        // The endpoint is protected by the new token we just saved.
        const user = await authService.getCurrentUserStatus();

        if (!user.has_finalized_signup) {
          // New User: Send to the Finalize Signup page
          navigate('/finalize-signup');
        } else {
          // Returning User: Send to Dashboard
          navigate('/dashboard');
        }
      } catch (err) {
        // If the token is invalid or the status check fails
        setError('Session verified, but could not check user status.');
        console.error("Callback Error:", err);
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8 text-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-xl shadow-card border border-border">
        {error ? (
          <>
            <h2 className="text-2xl font-bold text-destructive">Login Error</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/')}>Return to Login</Button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-lg font-medium">{status}</p>
            <p className="text-sm text-muted-foreground">Do not close this window.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCallbackPage;