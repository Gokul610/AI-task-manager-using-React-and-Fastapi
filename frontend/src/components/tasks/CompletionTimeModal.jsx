// frontend/src/components/tasks/CompletionTimeModal.jsx

import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const CompletionTimeModal = ({ task, onClose, onSave }) => {
  const [minutes, setMinutes] = useState('');
  const [error, setError] = useState('');
  const inputRef = React.useRef(null); // Ref for manual input focus

  // Reset local state when the task prop changes (e.g., modal opens for a new task)
  useEffect(() => {
    setMinutes('');
    setError('');
  }, [task]); 

  const handleSaveWithTime = (e) => {
    e.preventDefault();
    const timeValue = parseInt(minutes, 10);
    if (isNaN(timeValue) || timeValue <= 0) {
      setError('Please enter a valid number of minutes (greater than 0).');
      return;
    }
    setError('');
    // onSave expects the task and the time in minutes
    onSave(task, timeValue);
    // onClose(); // Let TaskList handle closing after successful save
  };

  const handleCompleteWithoutLogging = () => {
    // Call onSave with the task and 0 to indicate completion without logging time
    onSave(task, 0); // Using 0 to indicate completion without logging
    // onClose(); // Let TaskList handle closing after successful save
  };
  
  // --- NEW: Handle quick-select options ---
  const handleQuickSelect = (min) => {
    if (min === 'more') {
      // For "More than 3 hours", focus the manual input field
      inputRef.current.focus();
      return;
    }
    setMinutes(String(min));
    setError('');
  };
  // ----------------------------------------

  return (
    // Modal Styles (overlay and content container)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md p-6 bg-card text-card-foreground rounded-lg shadow-xl border border-border">
        <h2 className="mb-2 text-xl font-semibold">Log Time & Complete Task</h2>
        <p className="mb-4 text-sm text-muted-foreground truncate" title={task.title}>
          Task: <strong>{task.title}</strong>
        </p>

        {error && (
          <p className="px-4 py-2 mb-4 text-xs font-medium text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">
            {error}
          </p>
        )}
        
        {/* --- NEW: Quick-Select Buttons --- */}
        <div className="mb-6 border-b border-border/50 pb-4">
            <label className="block mb-3 text-sm font-medium text-muted-foreground">
                Quick Select:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button 
                    type="button" 
                    variant="secondary" 
                    className="w-auto px-4 py-2 text-sm"
                    onClick={() => handleQuickSelect(60)}
                >
                    1 Hour
                </Button>
                <Button 
                    type="button" 
                    variant="secondary" 
                    className="w-auto px-4 py-2 text-sm"
                    onClick={() => handleQuickSelect(120)}
                >
                    2 Hours
                </Button>
                <Button 
                    type="button" 
                    variant="secondary" 
                    className="w-auto px-4 py-2 text-sm"
                    onClick={() => handleQuickSelect(180)}
                >
                    3 Hours
                </Button>
                <Button 
                    type="button" 
                    variant="secondary" 
                    className="w-auto px-4 py-2 text-sm"
                    onClick={() => handleQuickSelect('more')}
                >
                    >3 Hours
                </Button>
            </div>
        </div>
        {/* ---------------------------------- */}


        <form onSubmit={handleSaveWithTime} className="space-y-4">
          <Input
            label="Or enter time manually (minutes):"
            id="completion-time"
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="e.g., 45"
            min="1"
            required
            aria-label="Minutes taken for task"
            // --- NEW: Attach the ref ---
            ref={inputRef} 
            // --------------------------
          />

          {/* --- Button Group --- */}
          <div className="flex justify-end gap-3 pt-3">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-auto px-4 py-2 text-sm font-semibold text-muted-foreground rounded-lg hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>

            {/* Complete Without Logging Button */}
            <Button
              type="button"
              variant="secondary" // Unified style
              className="w-auto px-4 py-2 text-sm"
              onClick={handleCompleteWithoutLogging}
            >
              Skip Logging
            </Button>

            {/* Save Button */}
            <Button 
                type="submit" 
                variant="primary" // Primary action
                className="w-auto px-4 py-2 text-sm"
            >
              Save & Complete
            </Button>
          </div>
          {/* ------------------ */}
        </form>
      </div>
    </div>
  );
};

export default CompletionTimeModal;