// frontend/src/components/tasks/TaskList.jsx

import React, { useState, useEffect, useCallback } from 'react';
import taskService from '../../services/taskService';
import TaskItem from './TaskItem';
// --- REMOVED IMPORTS ---
// import NewTaskModal from './NewTaskModal';
// import ManualTaskModal from './ManualTaskModal';
// import VoiceTaskModal from './VoiceTaskModal'; 
// import Button from '../ui/Button';
// -----------------------
import TaskEditModal from './TaskEditModal';
import CompletionTimeModal from './CompletionTimeModal';
import SnoozeModal from './SnoozeModal';
import ConfirmationModal from '../ui/ConfirmationModal';
import SuggestionModal from './SuggestionModal';
import { motion, AnimatePresence } from 'framer-motion';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [taskToLogTime, setTaskToLogTime] = useState(null);

  // --- Filter State ---
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRange, setFilterRange] = useState('today');
  // --------------------

  // --- Modal States ---
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [taskToSnooze, setTaskToSnooze] = useState(null);
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  
  const [suggestion, setSuggestion] = useState(null); 
  const [taskForSuggestion, setTaskForSuggestion] = useState(null);
  
  // --- REMOVED MODAL STATES ---
  // const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  // const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  // --------------------------
  

  // Fetch tasks logic wrapped in useCallback
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const apiFilters = { 
        status: filterStatus,
        show: filterRange 
      };

      const data = await taskService.getAllTasks(apiFilters);
      
      data.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.priority_score !== b.priority_score) return b.priority_score - a.priority_score;
        if (a.due_date === null && b.due_date !== null) return 1;
        if (a.due_date !== null && b.due_date === null) return -1;
        if (a.due_date === null && b.due_date === null) return 0;
        return new Date(a.due_date) - new Date(b.due_date);
      });
      setTasks(data);
    } catch (err) {
      setError('Failed to fetch tasks.');
      console.error(err);
    }
    setLoading(false);
  }, [filterStatus, filterRange]); // Re-fetch on filter change

  useEffect(() => {
    fetchTasks();
    
    // --- NEW: Add event listener to refresh list ---
    // This allows DashboardPage to trigger a refetch
    document.addEventListener('taskUpdated', fetchTasks);
    return () => {
      document.removeEventListener('taskUpdated', fetchTasks);
    };
    // ---------------------------------------------
  }, [fetchTasks]); 

  // --- REMOVED: handleTaskCreated (now in DashboardPage) ---

  const handleTaskUpdated = (updatedTask) => {
    fetchTasks(); 
    setEditingTask(null); 
    setTaskToLogTime(null);
    setIsSnoozeModalOpen(false); 
    setTaskToSnooze(null);
    // --- Notify gamification components ---
    document.dispatchEvent(new CustomEvent('taskUpdated'));
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await taskService.deleteTask(taskToDelete.id);
      setTasks(tasks.filter((task) => task.id !== taskToDelete.id));
      closeDeleteConfirm();
      // --- Notify gamification components ---
      document.dispatchEvent(new CustomEvent('taskUpdated'));
    } catch (err) {
      setError('Failed to delete task.');
      console.error('Failed to delete task', err);
    }
  };

  // --- Modal Open/Close ---
  const openEditModal = (task) => setEditingTask(task);
  const closeEditModal = () => setEditingTask(null);
  const closeCompletionModal = () => setTaskToLogTime(null);

  const openDeleteConfirm = (task) => {
    setTaskToDelete(task);
    setIsConfirmDeleteOpen(true);
  };
  const closeDeleteConfirm = () => {
    setTaskToDelete(null);
    setIsConfirmDeleteOpen(false);
  };
  
  const openSnoozeModal = (task) => {
    setTaskToSnooze(task);
    setIsSnoozeModalOpen(true);
  };
  const closeSnoozeModal = () => {
    setTaskToSnooze(null);
    setIsSnoozeModalOpen(false);
  };
  const handleConfirmSnooze = async (newDueDate) => {
    if (!taskToSnooze || !newDueDate) return;
    try {
      const updatedTask = await taskService.updateTask(taskToSnooze.id, {
        due_date: newDueDate.toISOString(),
        action_type: 'snoozed',
      });
      handleTaskUpdated(updatedTask);
    } catch (err) {
      setError('Failed to snooze task.');
      console.error('Failed to snooze task', err);
    }
  };
  
  const openSuggestionModal = (task) => {
    if (task.task_metadata && task.task_metadata.smart_suggestion) {
      setSuggestion(task.task_metadata.smart_suggestion);
      setTaskForSuggestion(task);
    } else {
      console.error("Tried to open suggestion modal, but no suggestion was found in task_metadata.");
    }
  };
  const closeSuggestionModal = () => {
    setSuggestion(null);
    setTaskForSuggestion(null);
  };
  
  const handleConfirmSchedule = async (payload) => {
    if (!taskForSuggestion) return;
    try {
      const updatedTask = await taskService.updateTask(taskForSuggestion.id, {
        due_date: payload, // payload is the ISO date string
        action_type: 'edited', // Log this as an edit
      });
      handleTaskUpdated(updatedTask); // Pass the updated task to trigger refresh
    } catch (err) {
      setError('Failed to apply suggestion.');
      console.error('Failed to apply schedule suggestion', err);
    }
    closeSuggestionModal();
  };

  const handleConfirmSplit = async (payload) => {
    if (!taskForSuggestion) return;
    try {
      await taskService.splitTask(payload);
      fetchTasks(); 
      // Also notify gamification components
      document.dispatchEvent(new CustomEvent('taskUpdated'));
    } catch (err) {
      setError('Failed to split task.');
      console.error('Failed to apply split suggestion', err);
    }
    closeSuggestionModal();
  };
  
  // --- REMOVED: Modal open/close handlers ---
  // ------------------------------------------

  const requestToggleComplete = async (task) => {
    const isCompleting = !task.completed;
    if (isCompleting && task.ask_completion_time) {
      setTaskToLogTime(task);
    } else {
      try {
        setLoading(true);
        const actionType = isCompleting ? 'completed_basic' : 'edited';
        const updatedTask = await taskService.updateTask(task.id, { 
             completed: isCompleting,
             action_type: actionType 
        });
        handleTaskUpdated(updatedTask);
      } catch (err) {
        setError('Failed to update task.');
        console.error('Failed to toggle task complete state', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveCompletionTime = async (task, minutes) => {
      console.log(`Task ${task.id} (${task.title}) took ${minutes > 0 ? minutes + ' minutes' : 'time not logged'}.`);
      
      try {
          setLoading(true);
          const updateData = { 
            completed: true,
            action_type: 'logged_time',
            completion_time_minutes: minutes
          };
          const updatedTask = await taskService.updateTask(task.id, updateData);
          handleTaskUpdated(updatedTask);
      } catch (err) {
            setError('Failed to complete task after logging time.');
            console.error('Failed to complete task', err);
      } finally {
        setLoading(false);
      }
  };
  // --------------------------------------

  return (
    <>
      {/* --- REMOVED: NewTaskModal and "Add Manually" button --- */}

      {/* Main task list container */}
      <div className="p-6 bg-card/90 backdrop-blur-sm text-card-foreground rounded-lg shadow-card border border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            {/* --- MODIFIED: Title changed to "Priority Matrix" --- */}
            <h3 className="text-xl font-semibold">Your Tasks</h3>
            
            {/* Filter Controls */}
            <div className="flex items-center gap-3">
                <label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">Status:</label>
                {/* --- MODIFIED: Restyled <select> --- */}
                <select
                  id="status-filter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="form-select px-3 py-1.5 text-sm border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-transparent transition-colors"
                  aria-label="Filter by status"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>

              <label htmlFor="range-filter" className="text-sm font-medium text-muted-foreground ml-2">Show:</label>
              {/* --- MODIFIED: Restyled <select> --- */}
              <select
                  id="range-filter"
                  value={filterRange}
                  onChange={(e) => setFilterRange(e.target.value)}
                  className="form-select px-3 py-1.5 text-sm border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-transparent transition-colors"
                  aria-label="Filter by date range"
                >
                  <option value="today">Today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="last7days">Last 7 Days</option>
                  <option value="last28days">Last 28 Days</option>
                </select>
            </div>
        </div>

        {/* Loading message */}
        {loading && <p className="mt-4 text-muted-foreground text-center">Loading tasks...</p>}

        {/* Error message */}
        {error && !loading && (
          <p className="px-4 py-3 mt-4 text-sm font-medium text-center text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">
            {error}
          </p>
        )}

        {!loading && !error && (
          <motion.ul layout className="mt-6 space-y-4">
            <AnimatePresence>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {filterRange === 'today'
                    ? "No tasks for today. Add one above!"
                    : "No tasks match the current filters."
                  }
                </p>
              ) : (
                tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onRequestToggleComplete={() => requestToggleComplete(task)}
                    onRequestDelete={() => openDeleteConfirm(task)}
                    onRequestSnooze={() => openSnoozeModal(task)}
                    onEdit={() => openEditModal(task)}
                    onTaskUpdated={handleTaskUpdated}
                    
                    onRequestSplit={openSuggestionModal}
                    onRequestSchedule={openSuggestionModal}
                  />
                ))
              )}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={`edit-${editingTask.id}`}>
            <TaskEditModal task={editingTask} onClose={closeEditModal} onTaskUpdated={handleTaskUpdated}/>
          </motion.div>
        )}
      </AnimatePresence>

       {/* Completion Time Modal */}
       <AnimatePresence>
         {taskToLogTime && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={`complete-${taskToLogTime.id}`}>
                <CompletionTimeModal task={taskToLogTime} onClose={closeCompletionModal} onSave={handleSaveCompletionTime}/>
            </motion.div>
         )}
       </AnimatePresence>

       {/* Confirmation Modal (for Delete) */}
       <ConfirmationModal
          isOpen={isConfirmDeleteOpen}
          onClose={closeDeleteConfirm}
          onConfirm={handleConfirmDelete}
          title="Delete Task?"
          message={`Are you sure you want to delete "${taskToSnooze?.title}"?`}
          confirmText="Delete"
          confirmVariant="destructive"
       />

       {/* Snooze Modal */}
       <SnoozeModal
          isOpen={isSnoozeModalOpen}
          onClose={closeSnoozeModal}
          onSnooze={handleConfirmSnooze}
          taskTitle={taskToSnooze?.title}
       />
       
       {/* Suggestion Modal (This logic is unchanged) */}
       <SuggestionModal
          isOpen={!!suggestion}
          onClose={closeSuggestionModal}
          onConfirmSchedule={handleConfirmSchedule}
          onConfirmSplit={handleConfirmSplit}
          suggestion={suggestion}
       />

      {/* --- REMOVED: ManualTaskModal and VoiceTaskModal --- */}
      {/* --- They are now rendered in DashboardPage.jsx --- */}
    </>
  );
};

export default TaskList;