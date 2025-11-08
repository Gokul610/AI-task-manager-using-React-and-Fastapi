// frontend/src/components/tasks/TaskEditModal.jsx

import React, { useState, useEffect } from 'react';
import taskService from '../../services/taskService';
import Button from '../ui/Button';
import Input from '../ui/Input';

const TaskEditModal = ({ task, onClose, onTaskUpdated }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const initialDueDate = task.due_date
    ? new Date(new Date(task.due_date).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : '';
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [importance, setImportance] = useState(task.importance);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    const newDueDate = task.due_date
      ? new Date(new Date(task.due_date).getTime() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : '';
    setDueDate(newDueDate);
    setImportance(task.importance);
    setError('');
  }, [task]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const updateData = {
      title,
      description: description || null,
      // Convert to ISO string for backend, passing null if empty
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      importance: importance,
      // --- NEW: Add action_type for explicit edit logging ---
      action_type: 'edited',
      // -----------------------------------------------------
    };

    try {
      const updatedTask = await taskService.updateTask(task.id, updateData);
      onTaskUpdated(updatedTask);
      onClose();
    } catch (err) {
      setError('Failed to update task. Please try again.');
      console.error(err);
    }
    setLoading(false);
  };

  // --- Modal Styles ---
  // Overlay: dark background with blur
  // Content: Solid card background, border
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg p-6 bg-card text-card-foreground rounded-lg shadow-xl border border-border">
        <h2 className="mb-4 text-2xl font-semibold">Edit Task</h2>
        {error && (
          <p className="px-4 py-3 mb-4 text-sm font-medium text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">
            {error}
          </p>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Input already themed */}
          <Input
            label="Title"
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div>
            <label htmlFor="edit-description" className="block mb-2 text-sm font-medium text-muted-foreground">
              Description
            </label>
            {/* Textarea themed */}
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="form-textarea w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
            />
          </div>
          {/* Input already themed */}
          <Input
            label="Due Date"
            id="edit-due-date"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            // Style date/time picker indicator for dark mode
            className="dark:[color-scheme:dark]"
          />
          <div>
            <label htmlFor="edit-importance" className="block mb-2 text-sm font-medium text-muted-foreground">
              Importance (1-5)
            </label>
            {/* Select themed */}
            <select
              id="edit-importance"
              value={importance}
              onChange={(e) => setImportance(parseInt(e.target.value, 10))}
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
            {/* Cancel Button themed */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            {/* Save Button themed (already handled by Button component) */}
            <Button type="submit" disabled={loading} className="w-auto px-6 py-2">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskEditModal;
