// frontend/src/pages/FinalizeSignupPage.jsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import authService from '../services/authService';

const FinalizeSignupPage = () => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  //const [grantedCalendar, setGrantedCalendar] = useState(true);Default to true since permission was asked by Google
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFinalize = async (e) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('You must agree to the Terms & Conditions to use the application.');
      return;
    }

    setLoading(true);
    try {
      // 1. Call the backend finalize endpoint
      await authService.finalizeSignup(agreedToTerms);
      
      // 2. Redirect to dashboard
      navigate('/dashboard');

    } catch (err) {
      const errorDetail = err.response?.data?.detail || 'Signup failed. Please try again.';
      setError(errorDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-xl shadow-card border border-border text-center"
      >
        <h2 className="text-3xl font-bold text-primary">
          One Last Step, {loading ? 'Please Wait...' : 'Ready to Launch'}
        </h2>
        
        {error && (
          <p className="px-4 py-3 text-sm font-medium text-center text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">
            {error}
          </p>
        )}

        <form onSubmit={handleFinalize} className="space-y-4 text-left">
          
          {/* Calendar Permission Checkbox */}
          <div className="flex items-start">
            <input
              id="calendar-access"
              type="checkbox"
              checked={true} // Always checked, as Google already asked for it
              readOnly
              className="mt-1 h-5 w-5 rounded-md border-border text-primary bg-input"
            />
            <label htmlFor="calendar-access" className="ml-3 text-sm text-muted-foreground">
              **Calendar Access Granted.** Google has already permitted AI Task Manager to sync tasks for notifications.
            </label>
          </div>

          {/* Terms & Conditions Checkbox (Crucial Step) */}
          <div className="flex items-start">
            <input
              id="terms-agree"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              required
              className="mt-1 h-5 w-5 rounded-md border-border text-primary bg-input"
            />
            <label htmlFor="terms-agree" className="ml-3 text-sm text-muted-foreground">
              I agree to the <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms & Conditions</Link>.
            </label>
          </div>
          
          {/* Finish Signup Button */}
          <div className="pt-4">
            <Button type="submit" disabled={loading || !agreedToTerms}>
              {loading ? 'Finalizing...' : 'Start Optimizing My Tasks'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default FinalizeSignupPage;