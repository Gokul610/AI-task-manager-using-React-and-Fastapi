// frontend/src/components/dashboard/ProgressWidget.jsx

import React, { useState, useEffect } from 'react';
import insightsService from '../../services/insightsService';
import { motion, AnimatePresence } from 'framer-motion';

// A single progress bar card
const ProgressCard = ({ stat, textColor, bgColor }) => {
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    // Calculate percentage, handling division by zero
    const newPercentage = stat.total > 0 ? (stat.completed / stat.total) * 100 : 0;
    // Set a timeout to allow the card to render before animating the bar
    const timer = setTimeout(() => setPercentage(newPercentage), 100);
    return () => clearTimeout(timer);
  }, [stat]);

  return (
    // --- MODIFICATION: Added backdrop-blur and semi-opacity to the card ---
    <div className="p-4 bg-card/90 backdrop-blur-sm rounded-lg shadow-card border border-border">
    {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
        {/* Use the full text color class */}
        <span className={`text-lg font-semibold ${textColor}`}>{stat.completed} / {stat.total}</span>
      </div>
      <div className="w-full bg-input rounded-full h-2.5">
        <motion.div
          // Use the full background color class
          // --- MODIFICATION: Added shadow-primary-glow for the teal bar ---
          className={`h-2.5 rounded-full ${bgColor} ${bgColor === 'bg-primary' ? 'shadow-primary-glow' : ''}`}
          // ---------------------------------------------------------------
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
};

// The main widget containing all three cards
const ProgressWidget = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await insightsService.getProgressSummary();
        setSummary(data);
      } catch (err) {
        console.error("Failed to fetch progress summary:", err);
        setError("Could not load progress.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();

    // Re-fetch when a task is updated
    document.addEventListener('taskUpdated', fetchSummary);
    return () => {
      document.removeEventListener('taskUpdated', fetchSummary);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Skeleton loaders */}
        {[...Array(3)].map((_, i) => (
          // --- MODIFICATION: Matched skeleton to new glass style ---
          <div key={i} className="p-4 bg-card/90 backdrop-blur-sm rounded-lg shadow-card border border-border animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
            <div className="w-full bg-input rounded-full h-2.5"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8 p-4 bg-destructive/20 text-destructive-foreground border border-destructive/30 rounded-lg text-center">
        {error}
      </div>
    );
  }

  if (!summary) {
    return null; // Don't show anything if there's no data
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      >
        {/* Pass the full static class names as props */}
        <ProgressCard 
          stat={summary.today} 
          textColor="text-primary" 
          bgColor="bg-primary" 
        />
        <ProgressCard 
          stat={summary.week} 
          textColor="text-priority-low" 
          bgColor="bg-priority-low" 
        />
        <ProgressCard 
          stat={summary.high_priority} 
          textColor="text-priority-high" 
          bgColor="bg-priority-high" 
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default ProgressWidget;