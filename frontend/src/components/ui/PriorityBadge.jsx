// frontend/src/components/ui/PriorityBadge.jsx

import React from 'react';

// --- NEW: Advanced SVG Icons ---
const PriorityIcon = ({ level }) => {
  // Using a "signal bars" metaphor
  if (level === 'High') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-priority-high">
        <path d="M3 21h3v-8H3v8zM9 21h3v-12H9v12zM15 21h3V8h-3v13zM21 21h3V3h-3v18z" />
      </svg>
    );
  }
  if (level === 'Medium') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-priority-medium">
        <path d="M3 21h3v-8H3v8zM9 21h3v-12H9v12zM15 21h3V8h-3v13z" />
      </svg>
    );
  }
  // Low
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-priority-low">
      <path d="M3 21h3v-8H3v8zM9 21h3v-12H9v12z" />
    </svg>
  );
};

// --- MODIFIED: The prop is still the full 'task' object ---
const PriorityBadge = ({ task }) => {
  const score = task.priority_score;
  const breakdown = task.task_metadata?.priority_breakdown;

  const getPriorityDetails = (score) => {
    if (score >= 70) {
      return {
        label: 'High',
        level: 'High',
        textColor: 'text-priority-high',
      };
    }
    if (score >= 40) {
      return {
        label: 'Medium',
        level: 'Medium',
        textColor: 'text-priority-medium',
      };
    }
    return {
      label: 'Low',
      level: 'Low',
      textColor: 'text-priority-low',
    };
  };

  const { label, level, textColor } = getPriorityDetails(score);

  return (
    // --- 1. Added a 'group' and 'relative' div to act as the hover target ---
    <div className="relative group">
      
      {/* --- 2. MODIFIED: Redesigned as a "glass" tag --- */}
      <span
        className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-semibold border rounded-md bg-background/50 backdrop-blur-sm border-border ${textColor}`}
      >
        <PriorityIcon level={level} />
        {label}
        <span className="font-normal text-muted-foreground">({Math.round(score)})</span>
      </span>

      {/* --- 3. This is the tooltip (unchanged logic, just styled) --- */}
      {breakdown && (
        <div className="absolute z-10 w-48 p-3 -top-2 left-1/2 -translate-x-1/2 -translate-y-full
                        invisible opacity-0 group-hover:visible group-hover:opacity-100 
                        bg-card text-card-foreground border border-border rounded-lg shadow-lg 
                        transition-opacity duration-200 pointer-events-none">
          
          <h4 className="font-semibold text-sm mb-1 text-card-foreground">Score: {score} pts</h4>
          <ul className="text-xs space-y-0.5 text-muted-foreground">
            <li>Urgency: {breakdown.urgency_score || 0} pts</li>
            <li>Importance: {breakdown.importance_score || 0} pts</li>
            <li>Difficulty: {breakdown.difficulty_boost || 0} pts</li>
          </ul>
          
          {/* This is the small triangle arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
                        border-x-4 border-x-transparent border-t-4 border-t-border" />
        </div>
      )}
      {/* ----------------------------- */}

    </div>
  );
};

export default PriorityBadge;