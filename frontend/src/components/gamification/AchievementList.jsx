// frontend/src/components/gamification/AchievementList.jsx

import React, { useState, useEffect } from 'react';
import gamificationService from '../../services/gamificationService';
import { motion, AnimatePresence } from 'framer-motion';

// A single achievement item
const AchievementItem = ({ achievement }) => (
  <motion.li
    layout
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
    // --- MODIFIED: Use background instead of card for inner items ---
    className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border" // Use background for a slight contrast
  >
    <span className="text-3xl" role="img" aria-label={achievement.name}>
      {achievement.emoji}
    </span>
    <div>
      <h4 className="font-semibold text-card-foreground">{achievement.name}</h4>
      <p className="text-sm text-muted-foreground">{achievement.description}</p>
    </div>
  </motion.li>
);

// The main list component
const AchievementList = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const status = await gamificationService.getGamificationStatus();
      // Sort achievements to show newest first (optional, but nice)
      setAchievements(status.achievements.reverse() || []);
    } catch (err) {
      console.error("Failed to fetch achievements:", err);
      setError("Could not load achievements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();

    // Listen for the custom event to refetch when a task is completed
    const handleTaskUpdate = () => {
      fetchAchievements();
    };
    document.addEventListener('taskUpdated', handleTaskUpdate);

    return () => {
      document.removeEventListener('taskUpdated', handleTaskUpdate);
    };
  }, []);

  return (
    // --- MODIFIED: Removed h-full and flex-col ---
    <div className="p-6 bg-card/90 backdrop-blur-sm text-card-foreground rounded-lg shadow-card border border-border">
    {/* ------------------------------------------- */}
      <h3 className="text-xl font-semibold mb-4 flex-shrink-0">Achievements</h3>
      
      {loading && <p className="text-muted-foreground text-center py-4">Loading achievements...</p>}
      
      {error && (
        <p className="px-4 py-3 text-sm font-medium text-center text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">
          {error}
        </p>
      )}

      {!loading && !error && (
        <AnimatePresence>
          {achievements.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Keep completing tasks to unlock your first achievement!
            </p>
          ) : (
            // --- MODIFIED: Changed to a horizontal grid layout ---
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* ------------------------------------------------- */}
              {achievements.map((ach) => (
                <AchievementItem key={ach.id} achievement={ach} />
              ))}
            </ul>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default AchievementList;