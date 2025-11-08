// frontend/src/components/charts/WeeklySummary.jsx

import React, { useState, useEffect } from 'react';
import summaryService from '../../services/summaryService';
import Button from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to format the "Generated at" timestamp
const formatTimestamp = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const WeeklySummary = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetches the default (cached) summary
  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await summaryService.getWeeklySummary();
      setSummaryData(data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
      setError("Could not load your weekly summary.");
    } finally {
      setLoading(false);
    }
  };

  // Forces a new summary to be generated
  const handleRegenerate = async () => {
    try {
      setLoading(true); // Show loading spinner while AI works
      setError(null);
      const data = await summaryService.regenerateWeeklySummary();
      setSummaryData(data);
    } catch (err) {
      console.error("Failed to regenerate summary:", err);
      setError("An error occurred while regenerating your summary.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary when the component first loads
  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    // --- MODIFIED: Removed duplicate card styles ---
    // The parent (InsightsPage) now provides the card styles.
    // We only need padding.
    <div className="p-6 text-card-foreground">
    {/* ------------------------------------------- */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Weekly AI Summary</h3>
        <Button
          variant="secondary"
          className="w-auto px-3 py-1.5 text-xs"
          onClick={handleRegenerate}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Regenerate Now'}
        </Button>
      </div>
      
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8 text-muted-foreground"
          >
            {/* Simple spinner */}
            <svg className="animate-spin h-6 w-6 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2">Generating your summary...</p>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-3 text-sm font-medium text-center text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {summaryData && !loading && !error && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Render the HTML summary from the API */}
            <div
              className="prose prose-sm prose-invert max-w-none text-card-foreground"
              dangerouslySetInnerHTML={{ __html: summaryData.summary_html }}
            />
            <p className="text-xs text-muted-foreground mt-4 text-right">
              Generated: {formatTimestamp(summaryData.generated_at)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WeeklySummary;