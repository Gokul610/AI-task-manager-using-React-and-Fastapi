// frontend/src/pages/LandingPage.jsx

import React from 'react';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';

// Simple Google Icon SVG
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.221 0-9.754-3.586-11.303-8.334l-6.571 4.819A20.007 20.007 0 0 0 24 44z"></path>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C39.099 34.925 44 28.099 44 20c0-1.341-.138-2.65-.389-3.917z"></path>
  </svg>
);

const LandingPage = () => {

  const handleGoogleLogin = () => {
    // This will redirect the user to our backend's login endpoint.
    // The backend will then redirect them to Google.
    window.location.href = 'http://localhost:8000/auth/google/login';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <span className="text-6xl" role="img" aria-label="rocket">🎯</span>
        <h1 className="mt-4 text-5xl font-bold">
          AI Task Manager
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-4 text-xl text-muted-foreground"
        >
          The smart partner for your productivity.
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.0 }}
        className="mt-16 w-full max-w-xs"
      >
        <Button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-4 text-lg"
          variant="secondary" // Use a prominent, non-primary color
        >
          <GoogleIcon />
          Continue with Google
        </Button>
      </motion.div>

      {/* Animated feature list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.5 }}
        className="mt-16 text-center text-muted-foreground"
      >
        <p>✓ AI-Powered Task Creation</p>
        <p>✓ Smart Prioritization</p>
        <p>✓ Google Calendar Sync & Notifications</p>
      </motion.div>
    </div>
  );
};

export default LandingPage;