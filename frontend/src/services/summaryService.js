// frontend/src/services/summaryService.js

import apiClient from './api';

const summaryService = {
  /**
   * Fetches the user's weekly summary.
   * By default, this returns a cached version if it's less than 24 hours old.
   */
  getWeeklySummary: async () => {
    const response = await apiClient.get('/summary/weekly');
    return response.data;
  },

  /**
   * Forces the backend to regenerate a new weekly summary.
   */
  regenerateWeeklySummary: async () => {
    const response = await apiClient.get('/summary/weekly?force_regenerate=true');
    return response.data;
  },
};

export default summaryService;