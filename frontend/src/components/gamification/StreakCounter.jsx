// frontend/src/components/gamification/StreakCounter.jsx

import React, { useState, useEffect } from 'react';
import gamificationService from '../../services/gamificationService';
import { AnimatePresence, motion } from 'framer-motion';

const StreakCounter = () => {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        setLoading(true);
        const status = await gamificationService.getGamificationStatus();
        setStreak(status.current_streak || 0);
      } catch (err) {
        console.error("Failed to fetch streak:", err);
        setError("Could not load streak.");
      } finally {
        setLoading(false);
      }
    };

    fetchStreak();

    // Set up an event listener to refetch streak when a task is completed
    // This is a simple way to keep it in sync without complex state management
    const handleTaskUpdate = () => {
      fetchStreak();
    };

    // We assume the TaskList (or another parent) might dispatch a custom event
    // or we can just refetch periodically. For now, we'll fetch on load
    // and when a task is completed (which we'll listen for)
    document.addEventListener('taskUpdated', handleTaskUpdate);

    return () => {
      document.removeEventListener('taskUpdated', handleTaskUpdate);
    };
  }, []);

  // Don't show anything if loading, error, or streak is 0
  if (loading || error || streak === 0) {
    return null; // Keep the header clean if no streak
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-priority-medium/20 text-priority-medium border border-priority-medium/30"
      >
        <span className="text-lg" role="img" aria-label="fire">🔥</span>
        <span className="text-sm font-semibold">
          {streak}-Day Streak
        </span>
      </motion.div>
    </AnimatePresence>
  );
};

export default StreakCounter;