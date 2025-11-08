// frontend/src/components/tasks/NewTaskModal.jsx

import React, { useState } from 'react';
import taskService from '../../services/taskService';
import Button from '../ui/Button';
import Input from '../ui/Input';

// --- MODIFICATION: Add onVoiceInputClick and onManualInputClick props ---
const NewTaskModal = ({ onTaskCreated, onVoiceInputClick, onManualInputClick }) => {
  const [nlpText, setNlpText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nlpText) return;
    setLoading(true);
    setError('');
    try {
      const newTask = await taskService.createTask({ nlp_text: nlpText });
      
      // 1. Refresh the task list
      onTaskCreated(newTask);
      setNlpText('');
      
      // 2. Suggestion logic is now handled by TaskItem, so nothing else needed here.

    } catch (err) {
      // Improved error handling
      const errorDetail = err.response?.data?.detail || 'Failed to create task. Please try again.';
      setError(errorDetail);
      console.error(err);
    }
    setLoading(false);
  };

  return (
    // --- MODIFIED: Removed h-full class ---
    <form onSubmit={handleSubmit} className="p-6 bg-card/90 backdrop-blur-sm text-card-foreground rounded-lg shadow-card border border-border">
    {/* ------------------------------------------- */}
      
      {/* --- NEW: Header row for Title and Manual Button --- */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Add New Task</h3>
        
        {/* --- MODIFIED: Wrapped Button in a div with flex-shrink-0 --- */}
        <div className="flex-shrink-0">
          <Button
            type="button"
            variant="primary"
            className="w-auto px-6 py-3 text-sm" // Matched className to Create Task button
            onClick={onManualInputClick}
          >
            Add Task Manually
          </Button>
        </div>
        {/* ---------------------------------------------------- */}

      </div>
      {/* ---------------------------------------------------- */}

      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Try: "Finish urgent report by next Friday at 3pm"
      </p>
      {error && (
        // Use destructive colors for error message
        <p className="px-4 py-3 mb-4 text-sm font-medium text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">
          {error}
        </p>
      )}
      <div className="flex items-center gap-4">
        <div className="flex-grow">
          {/* Input component already uses themed styles */}
          <Input
            id="nlp-task"
            type="text"
            value={nlpText}
            onChange={(e) => setNlpText(e.target.value)}
            placeholder="Enter your task in plain English..."
            required
            aria-label="New task input"
          />
        </div>
        
        {/* --- MODIFICATION: Added microphone button --- */}
        <div className="flex-shrink-0">
          <Button
            type="button" // Important: not 'submit'
            variant="ghost" // Use ghost variant for an icon button
            className="w-auto p-3.5" // Adjust padding for an icon
            onClick={onVoiceInputClick} // Call the new prop
            disabled={loading}
            title="Create task with voice"
          >
            {/* Microphone Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </Button>
        </div>
        {/* ------------------------------------------- */}

        <div className="flex-shrink-0">
          {/* Button component already uses themed styles */}
          <Button type="submit" disabled={loading} className="w-auto px-6 py-3">
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </div>
      
      {/* --- REMOVED: "Add manually" button from the bottom --- */}
    </form>
  );
};

export default NewTaskModal;