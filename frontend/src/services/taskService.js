// frontend/src/services/taskService.js

import apiClient from './api';

const taskService = {
  /**
   * Fetches tasks for the logged-in user, with optional filters.
   * @param {object} [filters] - Optional filters.
   * @param {string} [filters.status] - 'active', 'completed', or 'all'.
   * @param {string} [filters.show] - 'today', 'upcoming', 'last7days', 'last28days'.
   */
  getAllTasks: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.status) {
      params.append('status', filters.status);
    }
    
    // --- THIS IS THE MODIFIED LOGIC ---
    if (filters.show) {
      params.append('show', filters.show);
    }
    // --- No more startDate or endDate ---

    const queryString = params.toString();
    const url = `/tasks/${queryString ? '?' + queryString : ''}`;

    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Creates a new task using NLP text.
   * @param {object} taskData - Must contain { nlp_text: "..." }
   */
  createTask: async (taskData) => {
    const response = await apiClient.post('/tasks/', taskData);
    return response.data;
  },

  /**
   * Creates a new task from a manual form.
   * @param {object} taskData - { title, description, due_date, importance }
   */
  createTaskManually: async (taskData) => {
    // We send the data to the new /tasks/manual endpoint
    const response = await apiClient.post('/tasks/manual', taskData);
    return response.data;
  },

  /**
   * Updates an existing task.
   * @param {number} taskId
   * @param {object} taskUpdateData (e.g., { completed: true } or { due_date: "..." })
   */
  updateTask: async (taskId, taskUpdateData) => {
    const response = await apiClient.put(`/tasks/${taskId}`, taskUpdateData);
    return response.data;
  },

  /**
   * Deletes a task.
   * @param {number} taskId
   */
  deleteTask: async (taskId) => {
    const response = await apiClient.delete(`/tasks/${taskId}`);
    return response.data;
  },
  
  /**
   * Calls the AI to split a task into sub-tasks.
   * @param {number} taskId
   */
  splitTask: async (taskId) => {
    const response = await apiClient.post(`/ai-tools/split-task/${taskId}`);
    return response.data; // Returns the list of new sub-tasks
  },
};

export default taskService;