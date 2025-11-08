// frontend/src/components/tasks/SnoozeModal.jsx

import React, { useState, useEffect } from 'react'; // <-- Import useEffect here
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import Input from '../ui/Input';

// Helper to get date string for datetime-local input
const getLocalDateTimeString = (date) => {
    // Adjust for timezone offset to display correctly in local time input
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
    return localISOTime;
};

const SnoozeModal = ({
  isOpen,
  onClose,
  onSnooze, // Function to call with the new Date object
  taskTitle = "this task",
}) => {
  const [customDateTime, setCustomDateTime] = useState('');

  const handleSnoozeOption = (option) => {
    let newDueDate = new Date();

    switch (option) {
      case 'later_today': // e.g., +3 hours
        newDueDate.setHours(newDueDate.getHours() + 3);
        break;
      case 'tonight': // e.g., 7 PM today
        newDueDate.setHours(19, 0, 0, 0); // 7 PM
        // If it's already past 7 PM, set for tomorrow 7 PM
        if (newDueDate < new Date()) {
            newDueDate.setDate(newDueDate.getDate() + 1);
        }
        break;
      case 'tomorrow_morning': // e.g., Tomorrow 9 AM
        newDueDate.setDate(newDueDate.getDate() + 1);
        newDueDate.setHours(9, 0, 0, 0); // 9 AM
        break;
      case 'next_week': // e.g., Next Monday 9 AM
        const dayOfWeek = newDueDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const daysUntilNextMonday = (dayOfWeek === 0) ? 1 : (8 - dayOfWeek); // Add 1 day if Sunday, else 8-currentDay
        newDueDate.setDate(newDueDate.getDate() + daysUntilNextMonday);
        newDueDate.setHours(9, 0, 0, 0); // 9 AM
        break;
      default:
        console.error("Unknown snooze option:", option);
        return; // Don't proceed if option is unknown
    }
    onSnooze(newDueDate); // Pass the calculated Date object
    onClose();
  };

  const handleCustomSnooze = (e) => {
    e.preventDefault();
    if (!customDateTime) return;
    const newDueDate = new Date(customDateTime);
    if (isNaN(newDueDate.getTime()) || newDueDate <= new Date()) {
        alert("Please select a valid future date and time.");
        return;
    }
    onSnooze(newDueDate);
    onClose();
  };

  // Pre-calculate a default value for the custom date input (e.g., tomorrow 9am)
  const defaultCustomDate = React.useMemo(() => { // Wrap in useMemo for stability
      let date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(9,0,0,0);
      return getLocalDateTimeString(date);
  }, []); // Empty dependency array means it calculates once

   // --- This is where useEffect is used ---
   useEffect(() => {
    // Set default custom date when modal opens and customDateTime is empty
    if (isOpen && !customDateTime) {
      setCustomDateTime(defaultCustomDate);
    }
    // If modal closes, optionally reset customDateTime (might not be needed)
    // if (!isOpen) {
    //   setCustomDateTime('');
    // }
   }, [isOpen, customDateTime, defaultCustomDate]); // Include dependencies
   // ------------------------------------


  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm p-6 bg-card text-card-foreground rounded-lg shadow-xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-xl font-semibold">Snooze Task</h2>
            <p className="mb-5 text-sm text-muted-foreground truncate" title={taskTitle}>
              Task: <strong>{taskTitle}</strong>
            </p>

            {/* Snooze Option Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Button variant="secondary" className="w-full text-sm py-2" onClick={() => handleSnoozeOption('later_today')}>Later Today</Button>
              <Button variant="secondary" className="w-full text-sm py-2" onClick={() => handleSnoozeOption('tonight')}>Tonight</Button>
              <Button variant="secondary" className="w-full text-sm py-2" onClick={() => handleSnoozeOption('tomorrow_morning')}>Tomorrow</Button>
              <Button variant="secondary" className="w-full text-sm py-2" onClick={() => handleSnoozeOption('next_week')}>Next Week</Button>
            </div>

            {/* Custom Snooze Form */}
            <form onSubmit={handleCustomSnooze} className="space-y-3 border-t border-border pt-4">
               <label htmlFor="custom-snooze-date" className="block text-sm font-medium text-muted-foreground">
                 Or pick a date & time:
               </label>
               <Input
                  id="custom-snooze-date"
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  className="dark:[color-scheme:dark]" // Style date picker for dark mode
                  required
                />
               <div className="flex justify-end gap-3 pt-2">
                 <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-muted-foreground rounded-lg hover:bg-muted/50 transition-colors"
                 >
                    Cancel
                 </button>
                 <Button type="submit" className="w-auto px-4 py-2 text-sm">
                    Set Snooze
                 </Button>
               </div>
            </form>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SnoozeModal;