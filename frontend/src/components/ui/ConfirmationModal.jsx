// frontend/src/components/ui/ConfirmationModal.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button'; // Assuming Button is in the same ui directory

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "destructive", // Default to destructive style for confirmation
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={onClose} // Close if clicking outside the modal content
        >
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm p-6 bg-card text-card-foreground rounded-lg shadow-xl border border-border"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <h2 className="mb-2 text-xl font-semibold">{title}</h2>
            <p className="mb-6 text-sm text-muted-foreground">{message}</p>

            <div className="flex justify-end gap-3">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                {cancelText}
              </button>

              {/* Confirm Button */}
              <Button
                onClick={onConfirm}
                variant={confirmVariant} // Use the passed variant
                className="w-auto px-4 py-2 text-sm" // Adjust size
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;