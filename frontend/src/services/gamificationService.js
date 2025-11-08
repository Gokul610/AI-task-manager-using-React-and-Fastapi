// frontend/src/services/gamificationService.js

import apiClient from './api';

const gamificationService = {
  /**
   * Fetches the user's current gamification status (streaks, achievements).
   */
  getGamificationStatus: async () => {
    const response = await apiClient.get('/gamification/status');
    return response.data;
  },
};

export default gamificationService;