// frontend/src/App.jsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// --- DELETED IMPORTS: LoginPage, SignupPage ---
// --- NEW IMPORTS ---
import LandingPage from './pages/LandingPage';
import TermsPage from './pages/TermsPage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import FinalizeSignupPage from './pages/FinalizeSignupPage';
// -------------------
import DashboardPage from './pages/DashboardPage';
import InsightsPage from './pages/InsightsPage';
import './app.css';

// --- MODIFIED PrivateRoute Logic ---
// We now check if the user is authenticated via the token.
const PrivateRoute = ({ children }) => {
  // Check if we have an access token for our internal JWT
  const isLoggedIn = localStorage.getItem('authToken'); 
  return isLoggedIn ? children : <Navigate to="/" />; // Redirect to LandingPage
};
// -----------------------------------

function App() {
  // Get token status outside of render for initial navigation check
  const isAuthenticated = localStorage.getItem('authToken');

  return (
    <Routes>
      
      {/* 1. PUBLIC ROUTES (New Flow) */}
      
      {/* Landing Page: Our new entry point (replaces /login and /signup) */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Static Terms Page */}
      <Route path="/terms" element={<TermsPage />} />

      {/* Google Callback Page: Handles the redirect from Google */}
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

      {/* Finalize Signup: Protected page where new users check Terms/Calendar boxes */}
      <Route path="/finalize-signup" element={<FinalizeSignupPage />} />


      {/* 2. PRIVATE ROUTES (Protected by the PrivateRoute component) */}
      
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/insights"
        element={
          <PrivateRoute>
            <InsightsPage />
          </PrivateRoute>
        }
      />

      {/* 3. DEFAULT/FALLBACK ROUTE */}
      <Route
        path="*" // Catch all other routes
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" /> // If logged in but on a bad path
          ) : (
            <Navigate to="/" /> // If not logged in, go to Landing Page
          )
        }
      />
    </Routes>
  );
}

export default App;