// frontend/src/components/tasks/ManualTaskModal.jsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import taskService from '../../services/taskService';
import Button from '../ui/Button';
import Input from '../ui/Input';

// --- MODIFICATION: Remove onSuggestion from props ---
const ManualTaskModal = ({ isOpen, onClose, onTaskCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [importance, setImportance] = useState(3); // Default to Medium

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const taskData = {
      title,
      description: description || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      importance: Number(importance),
    };

    try {
      const newTask = await taskService.createTaskManually(taskData);
      
      // 1. Pass the new task up to TaskList to refresh the list
      onTaskCreated(newTask);
      
      // --- 2. MODIFICATION: Removed the check for smart_suggestion ---
      //    This modal no longer triggers the suggestion pop-up.
      
      // 3. Reset form and close modal
      onClose();
      setTitle('');
      setDescription('');
      setDueDate('');
      setImportance(3);

    } catch (err) {
      const errorDetail = err.response?.data?.detail || 'Failed to create task. Please try again.';
      setError(errorDetail);
    }
    setLoading(false);
  };

  const handleClose = () => {
    // Reset form fields on close
    setTitle('');
    setDescription('');
    setDueDate('');
    setImportance(3);
    setError('');
    setLoading(false);
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
          onClick={handleClose}
        >
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-lg p-6 bg-card text-card-foreground rounded-lg shadow-xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-2xl font-semibold">Add Task Manually</h2>
            {error && (
              <p className="px-4 py-3 mb-4 text-sm font-medium text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">
                {error}
              </p>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Title"
                id="manual-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <div>
                <label htmlFor="manual-description" className="block mb-2 text-sm font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  id="manual-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="form-textarea w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                />
              </div>
              <Input
                label="Due Date"
                id="manual-due-date"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="dark:[color-scheme:dark]"
              />
              <div>
                <label htmlFor="manual-importance" className="block mb-2 text-sm font-medium text-muted-foreground">
                  Importance (1-5)
                </label>
                <select
                  id="manual-importance"
                  value={importance}
                  onChange={(e) => setImportance(Number(e.target.value))}
                  className="form-select w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                >
                  <option value="1">1 (Low)</option>
                  <option value="2">2</option>
                  <option value="3">3 (Medium)</option>
                  <option value="4">4</option>
                  <option value="5">5 (High)</option>
                </select>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-semibold text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <Button type="submit" disabled={loading} className="w-auto px-6 py-2">
                  {loading ? 'Saving...' : 'Save Task'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ManualTaskModal;