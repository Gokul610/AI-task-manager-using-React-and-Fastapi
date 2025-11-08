// frontend/src/components/tasks/SuggestionModal.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';

const SuggestionModal = ({
  isOpen,
  onClose,
  onConfirmSchedule, // Specific handler for scheduling
  onConfirmSplit,    // Specific handler for splitting
  suggestion,
}) => {
  
  if (!isOpen || !suggestion) {
    return null;
  }

  const handleConfirm = () => {
    // Check the suggestion type to call the correct handler
    if (suggestion.type === 'schedule') {
      onConfirmSchedule(suggestion.payload); // Payload is the ISO date string
    } else if (suggestion.type === 'split') {
      onConfirmSplit(suggestion.payload); // Payload is the task ID
    }
    onClose();
  };

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
            className="w-full max-w-md p-6 bg-card text-card-foreground rounded-lg shadow-xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-xl font-semibold flex items-center gap-2">
              <span role="img" aria-label="sparkles">✨</span>
              Smart Suggestion
            </h2>
            
            <p className="mb-6 text-sm text-muted-foreground">
              {suggestion.text} {/* Display the text from the object */}
            </p>

            <div className="flex justify-end gap-3">
              {/* Dismiss Button */}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Dismiss
              </button>

              {/* Confirm Button */}
              <Button
                onClick={handleConfirm}
                className="w-auto px-4 py-2 text-sm"
              >
                Accept
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuggestionModal;