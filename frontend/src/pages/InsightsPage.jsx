// frontend/src/pages/InsightsPage.jsx

import React, { useState } from 'react'; // <-- 1. IMPORT useState
import Header from '../components/layout/Header';
import Heatmap from '../components/charts/Heatmap';
import VelocityChart from '../components/charts/VelocityChart';
import GanttChart from '../components/charts/GanttChart';
import WeeklySummary from '../components/charts/WeeklySummary';
import { motion, AnimatePresence } from 'framer-motion'; // <-- 2. IMPORT AnimatePresence
import Button from '../components/ui/Button'; // <-- 3. IMPORT Button

const InsightsPage = () => {
  // --- 4. NEW STATE for toggling summary ---
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  // -----------------------------------------

  return (
    // --- MODIFIED: Added subtle gradient to main page background ---
    <div className="min-h-screen bg-background text-foreground bg-gradient-to-br from-background to-card">
    {/* ----------------------------------------------------------- */}
       {/* Container to center content */}
      <div className="w-full max-w-6xl p-4 mx-auto md:p-8">
        <Header />
        <main>
          {/* --- 5. NEW LAYOUT for Title and Button --- */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-foreground">
              Insights Dashboard
            </h2>
            {/* --- MODIFIED: Wrapped Button in a div --- */}
            <div className="flex-shrink-0">
              <Button
                variant="primary"
                className="w-auto px-6 py-3 text-sm"
                onClick={() => setIsSummaryVisible(!isSummaryVisible)}
              >
                {isSummaryVisible ? 'Hide Summary' : 'View Weekly Summary'}
              </Button>
            </div>
            {/* ------------------------------------------- */}
          </div>
          {/* ------------------------------------------ */}
          
          {/* Grid for all charts */}
          <div className="grid grid-cols-1 gap-6">

            {/* --- 6. WRAPPED Summary in AnimatePresence --- */}
            <AnimatePresence>
              {isSummaryVisible && (
                <motion.div
                  key="summary-card"
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-card/90 backdrop-blur-sm text-card-foreground rounded-lg shadow-card border border-border overflow-hidden"
                >
                  <WeeklySummary />
                </motion.div>
              )}
            </AnimatePresence>
            {/* ------------------------------------------- */}

            {/* Row 2: Velocity and Heatmap (side-by-side on large screens) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* --- MODIFIED: Added glassmorphism styles --- */}
              <div className="p-6 bg-card/90 backdrop-blur-sm text-card-foreground rounded-lg shadow-card border border-border">
                {/* Chart title color */}
                <h3 className="mb-6 text-xl font-semibold text-center text-card-foreground">
                  Projected Completion
                </h3>
                <VelocityChart />
              </div>
              <div className="p-6 bg-card/90 backdrop-blur-sm text-card-foreground rounded-lg shadow-card border border-border">
              {/* ------------------------------------------- */}
                 {/* Chart title color */}
                <h3 className="mb-6 text-xl font-semibold text-center text-card-foreground">
                  Productivity Heatmap
                </h3>
                <Heatmap />
              </div>
            </div>

            {/* Row 3: Gantt Chart (full width) */}
            {/* --- MODIFIED: Added glassmorphism styles --- */}
            <div className="p-6 bg-card/90 backdrop-blur-sm text-card-foreground rounded-lg shadow-card border border-border">
            {/* ------------------------------------------- */}
              <h3 className="mb-6 text-xl font-semibold text-center text-card-foreground">
                Task Timeline
              </h3>
              {/* Set a max height and overflow for the Gantt chart container */}
              <div className="max-h-[500px] overflow-y-auto overflow-x-hidden pr-2">
                <GanttChart />
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default InsightsPage;