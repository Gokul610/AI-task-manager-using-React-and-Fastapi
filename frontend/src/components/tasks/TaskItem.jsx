// frontend/src/components/tasks/TaskItem.jsx

import React from 'react';
import PriorityBadge from '../ui/PriorityBadge';
import Button from '../ui/Button';
import { motion } from 'framer-motion';

// --- NEW: Circular Completion Button ---
const CompletionButton = ({ completed, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 transition-colors duration-200
                  flex items-center justify-center
                  ${completed 
                    ? 'bg-primary border-primary' 
                    : 'border-border hover:border-primary'
                  }`}
    >
      {completed && (
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary-foreground"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.path d="M20 6L9 17l-5-5"></motion.path>
        </motion.svg>
      )}
    </button>
  );
};

// Helper component for metadata icons
const MetadataIcon = ({ type }) => {
  // Using simple text-based icons for a cleaner look
  switch (type) {
    case 'people': return <span title="People" role="img" aria-label="People" className="text-xs">🧑</span>;
    case 'locations': return <span title="Locations" role="img" aria-label="Location" className="text-xs">📍</span>;
    case 'apps': return <span title="Apps" role="img" aria-label="Application" className="text-xs">📱</span>;
    case 'tags': return <span title="Tags" role="img" aria-label="Tag" className="text-xs">🏷️</span>;
    default: return null;
  }
};


const TaskItem = ({
  task,
  onRequestToggleComplete, 
  onRequestDelete,         
  onRequestSnooze,         
  onEdit,                  
  
  onRequestSplit,
  onRequestSchedule,

  onTaskUpdated, 
}) => {

  const handleDelete = (e) => {
    e.stopPropagation(); 
    onRequestDelete(task); 
  };
  
  const handleSnooze = (e) => {
    e.stopPropagation();
    onRequestSnooze(task);
  };
  
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(task);
  };

  const handleSplit = (e) => {
    e.stopPropagation();
    onRequestSplit(task); // Call parent handler in TaskList
  };

  const handleSchedule = (e) => {
    e.stopPropagation();
    onRequestSchedule(task); // Call parent handler in TaskList
  };

  const handleCompletionToggle = (e) => {
    e.stopPropagation();
    onRequestToggleComplete(task);
  };

  // --- Format Due Date (no changes) ---
  const formattedDate = task.due_date
    ? new Date(task.due_date).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;
    
  // --- Process Metadata (no changes) ---
  const metadataItems = [];
  if (task.task_metadata) {
    Object.entries(task.task_metadata).forEach(([type, values]) => {
      if (type !== 'smart_suggestion' && type !== 'priority_breakdown' && Array.isArray(values) && values.length > 0) {
        values.forEach(value => metadataItems.push({ type, value }));
      }
    });
  }
  
  const suggestion = task.task_metadata?.smart_suggestion;
  const showSuggestion = suggestion && !task.completed;

  // --- NEW: Determine priority COLOR class for the bar ---
  const getPriorityColorClass = (score) => {
    if (score >= 70) return 'bg-priority-high'; // High
    if (score >= 40) return 'bg-priority-medium'; // Medium
    return 'bg-priority-low'; // Low
  };
  const priorityColorClass = getPriorityColorClass(task.priority_score);
  // -------------------------------------------

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      // --- MODIFIED: Back to "glass" card, removed gradient, added relative/overflow ---
      className={`relative p-4 flex items-center gap-4 bg-card/90 backdrop-blur-sm rounded-lg shadow-card border border-border transition-all 
                  ${task.completed ? 'opacity-60' : 'hover:bg-card/80'}`}
      // -----------------------------------------------------------
      onClick={handleEdit} // Click anywhere on the item to edit
    >
      {/* --- RE-ADDED: Priority Color Accent Bar --- */}
      <div className="absolute left-0 top-0 bottom-0 w-[5px] rounded-l-lg overflow-hidden">
        {!task.completed && (
          <div className={`h-full w-full ${priorityColorClass}`}></div>
        )}
      </div>
      {/* ------------------------------------ */}

      {/* --- MODIFIED: Replaced checkbox with new CompletionButton (added pl-2) --- */}
      <div className="flex-shrink-0 pl-2">
        <CompletionButton 
          completed={task.completed} 
          onClick={handleCompletionToggle} 
        />
      </div>
      {/* --------------------------------------------------------- */}

      {/* Task Content */}
      <div className="flex-grow min-w-0"> {/* Added min-w-0 for proper text truncation */}
        {/* Title (MODIFIED: Removed line-through) */}
        <h4 className={`font-medium text-card-foreground truncate`} title={task.title}>
          {task.title}
        </h4>
        
        {/* MODIFIED: Description is now included */}
        {task.description && (
          <p className="text-sm text-muted-foreground italic overflow-hidden text-ellipsis whitespace-nowrap" title={task.description}>
            {task.description}
          </p>
        )}

        {/* Metadata (Due Date, Tags, and new PriorityBadge) */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {/* 1. New Priority Badge */}
          <PriorityBadge task={task} />

          {/* 2. Due Date */}
          {formattedDate && (
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span className="text-xs">{formattedDate}</span>
            </div>
          )}
          
          {/* 3. Other Metadata Tags */}
          {metadataItems.length > 0 && (
            <>
              {metadataItems.map(({ type, value }, index) => (
                <span key={`${type}-${value}-${index}`} className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-background/50 backdrop-blur-sm rounded-md border border-border">
                  <MetadataIcon type={type} />
                  {value}
                </span>
              ))}
            </>
          )}
        </div>
        
        {/* AI SUGGESTION BUTTONS */}
        {showSuggestion && (
          <div className="mt-3 pt-2 border-t border-white/10">
            {suggestion.type === 'split' && (
              <Button
                variant="ghost"
                className="w-auto h-auto px-2 py-1 text-xs text-primary hover:text-primary/90 justify-start"
                onClick={handleSplit}
              >
                <span role="img" aria-label="sparkles">✨</span> AI Suggestion: Split Task
              </Button>
            )}
            {suggestion.type === 'schedule' && (
              <Button
                variant="ghost"
                className="w-auto h-auto px-2 py-1 text-xs text-primary hover:text-primary/90 justify-start"
                onClick={handleSchedule}
              >
                <span role="img" aria-label="calendar">🗓️</span> AI Suggestion: Schedule Task
              </Button>
            )}
          </div>
        )}
      </div>

      {/* --- MODIFIED: Control Buttons (using new "icon" variant) --- */}
      <div className="flex-shrink-0 flex items-center gap-1">
        <Button
          variant="icon"
          className="rounded-md"
          onClick={handleSnooze}
          title="Snooze"
        >
          {/* Snooze Icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10zM16 12l-4 4-4-4M12 16V8"></path></svg>
        </Button>
        <Button
          variant="icon"
          className="hover:text-destructive hover:bg-destructive/10 rounded-md"
          onClick={handleDelete}
          title="Delete"
        >
          {/* Delete Icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </Button>
      </div>
      {/* --------------------------------------------------------- */}
    </motion.li>
  );
};

export default TaskItem;