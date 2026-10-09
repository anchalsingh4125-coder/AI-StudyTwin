import api from './api.js';

export const quizService = {
  startQuiz: async ({ subjectId, topicId, difficulty, numberOfQuestions }) => {
    const res = await api.post('/quizzes/start', {
      subjectId,
      topicId,
      difficulty,
      numberOfQuestions,
    });
    return res.data.data;
  },

  answerQuestion: async (quizId, { questionId, selectedOption, timeSpentSeconds, mistakeType }) => {
    const res = await api.post(`/quizzes/${quizId}/answer`, {
      questionId,
      selectedOption,
      timeSpentSeconds,
      mistakeType,
    });
    return res.data.data;
  },

  submitQuiz: async (quizId) => {
    const res = await api.post(`/quizzes/${quizId}/submit`);
    return res.data.data;
  },

  getQuizResult: async (quizId) => {
    const res = await api.get(`/quizzes/${quizId}/result`);
    return res.data.data;
  },

  getHistory: async (page = 1, limit = 10) => {
    const res = await api.get(`/quizzes/history?page=${page}&limit=${limit}`);
    return res.data;
  },
};

export default quizService;
