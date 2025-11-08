// frontend/src/services/insightsService.js

import apiClient from './api';

const insightsService = {
  /**
   * Fetches data for the Predictive Progress (Burndown) Chart.
   */
  getBurndownData: async () => {
    const response = await apiClient.get('/insights/burndown');
    return response.data;
  },

  /**
   * Fetches data for the Productivity Heatmap.
   */
  getHeatmapData: async () => {
    const response = await apiClient.get('/insights/heatmap');
    return response.data;
  },

  /**
   * --- NEW FUNCTION ---
   * Fetches the progress summary data for the dashboard.
   */
  getProgressSummary: async () => {
    const response = await apiClient.get('/insights/progress-summary');
    return response.data;
  },
  // --- END OF NEW FUNCTION ---
};

export default insightsService;