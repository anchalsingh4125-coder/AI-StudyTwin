import api from './api.js';

export const aiService = {
  diagnoseStudent: async () => {
    const res = await api.post('/ai/diagnose');
    return res.data.data.diagnosis;
  },

  getRecommendations: async () => {
    const res = await api.get('/ai/recommendations');
    return res.data.data.recommendations;
  },

  generateFreshRecommendations: async () => {
    const res = await api.post('/ai/recommendations');
    return res.data.data.recommendations;
  },

  getRecommendationHistory: async () => {
    const res = await api.get('/ai/recommendations/history');
    return res.data.data.history;
  },
};

export default aiService;
