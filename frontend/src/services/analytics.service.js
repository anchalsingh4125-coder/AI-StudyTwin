import api from './api.js';

export const analyticsService = {
  getOverview: async () => {
    const res = await api.get('/analytics/overview');
    return res.data.data;
  },

  getTopics: async () => {
    const res = await api.get('/analytics/topics');
    return res.data.data;
  },

  getMistakes: async () => {
    const res = await api.get('/analytics/mistakes');
    return res.data.data;
  },

  getReadiness: async () => {
    const res = await api.get('/analytics/readiness');
    return res.data.data;
  },
};

export default analyticsService;
