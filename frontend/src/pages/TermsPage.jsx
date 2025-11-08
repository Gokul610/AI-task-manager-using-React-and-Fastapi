// frontend/src/pages/TermsPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-primary mb-6">
          Terms & Conditions
        </h1>
        
        <div className="p-6 bg-card text-card-foreground rounded-lg shadow-card border border-border prose prose-invert prose-lg max-w-none">
          {/* This is placeholder text. You should replace this. */}
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using AI Task Manager ("the Service"), you accept and agree
            to be bound by the terms and provisions of this agreement.
          </p>

          <h2>2. Google Account & Calendar</h2>
          <p>
            This Service requires an active Google Account for authentication. By using the
            Service, you agree to provide access to your Google Calendar for the
            sole purpose of creating, reading, updating, and deleting task-related
            calendar events. We do not store your Google password.
          </p>

          <h2>3. Data Usage</h2>
          <p>
            We store your task data, associated metadata, and Google Calendar event IDs
            to provide the Service. Your data is not shared with third parties.
            We store your Google OAuth Refresh Token securely to maintain calendar
            synchronization.
          </p>

          <h2>4. Limitation of Liability</h2>
          <p>
            The Service is provided "as is." We are not liable for any data loss,
            missed notifications, or any other damages that may occur from
            the use of this Service.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link to="/finalize-signup">
            <Button className="w-auto px-6 py-3">
              Back to Signup
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default TermsPage;