import api from './api.js';

export const curriculumService = {
  getSubjects: async () => {
    const res = await api.get('/subjects');
    return res.data.data;
  },

  getTopicsBySubject: async (subjectId) => {
    const res = await api.get(`/subjects/${subjectId}/topics`);
    return res.data.data;
  },
};

export default curriculumService;
