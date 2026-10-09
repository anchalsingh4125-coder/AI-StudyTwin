import mongoose from 'mongoose';
import Quiz from '../models/quiz.model.js';
import QuestionAttempt from '../models/questionAttempt.model.js';
import Question from '../models/question.model.js';
import Topic from '../models/topic.model.js';
import Subject from '../models/subject.model.js';
import { recalculateStudentMastery } from '../services/mastery.service.js';

/**
 * @desc    Start a new quiz session with questions matching criteria
 * @route   POST /api/v1/quizzes/start
 * @access  Private
 */
export const startQuiz = async (req, res) => {
  try {
    const { subjectId, topicId, difficulty, numberOfQuestions } = req.body;
    const count = Math.min(Math.max(parseInt(numberOfQuestions, 10) || 5, 1), 50);

    // Build question filtering query
    const filter = {};

    if (topicId) {
      if (!mongoose.isValidObjectId(topicId)) {
        return res.status(400).json({ success: false, message: 'Invalid topicId format.' });
      }
      filter.topicId = topicId;
    } else if (subjectId) {
      if (!mongoose.isValidObjectId(subjectId)) {
        return res.status(400).json({ success: false, message: 'Invalid subjectId format.' });
      }
      const topics = await Topic.find({ subjectId }).select('_id');
      const topicIds = topics.map((t) => t._id);
      filter.topicId = { $in: topicIds };
    }

    if (difficulty && difficulty !== 'all') {
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ success: false, message: 'Invalid difficulty filter.' });
      }
      filter.difficulty = difficulty;
    }

    // Retrieve candidate questions
    const candidateQuestions = await Question.find(filter);
    if (!candidateQuestions || candidateQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No questions found matching the requested criteria.',
      });
    }

    // Shuffle and pick subset of questions
    const selectedQuestions = [...candidateQuestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, count);

    // Create the Quiz session
    const quiz = await Quiz.create({
      userId: req.user._id,
      subjectId: subjectId && mongoose.isValidObjectId(subjectId) ? subjectId : null,
      topicId: topicId && mongoose.isValidObjectId(topicId) ? topicId : null,
      difficulty: difficulty || 'all',
      status: 'in_progress',
      questions: selectedQuestions.map((q) => q._id),
      totalQuestions: selectedQuestions.length,
      startedAt: new Date(),
    });

    // Create initial QuestionAttempt records (unanswered placeholders)
    const initialAttempts = selectedQuestions.map((q) => ({
      userId: req.user._id,
      quizId: quiz._id,
      questionId: q._id,
      topicId: q.topicId,
      selectedOption: null,
      correctOption: q.correctOptionIndex,
      isCorrect: false,
      timeSpentSeconds: 0,
      difficulty: q.difficulty,
      mistakeType: 'unattempted',
    }));
    await QuestionAttempt.insertMany(initialAttempts);

    // Sanitize questions: strictly omit correctOptionIndex and explanation
    const sanitizedQuestions = selectedQuestions.map((q) => ({
      _id: q._id,
      topicId: q.topicId,
      questionText: q.questionText,
      options: q.options,
      difficulty: q.difficulty,
    }));

    return res.status(201).json({
      success: true,
      message: 'Quiz started successfully.',
      data: {
        quizId: quiz._id,
        totalQuestions: quiz.totalQuestions,
        difficulty: quiz.difficulty,
        startedAt: quiz.startedAt,
        questions: sanitizedQuestions,
      },
    });
  } catch (error) {
    console.error('[StartQuiz Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start quiz.',
    });
  }
};

/**
 * @desc    Record or update an answer to a question within an active quiz
 * @route   POST /api/v1/quizzes/:quizId/answer
 * @access  Private
 */
export const answerQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { questionId, selectedOption, timeSpentSeconds, mistakeType } = req.body;

    if (!mongoose.isValidObjectId(quizId) || !mongoose.isValidObjectId(questionId)) {
      return res.status(400).json({ success: false, message: 'Invalid quizId or questionId format.' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    // Ownership check
    if (quiz.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this quiz.' });
    }

    // Status check
    if (quiz.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot answer questions for a completed or inactive quiz.',
      });
    }

    // Question membership check
    const isQuestionInQuiz = quiz.questions.some((q) => q.toString() === questionId);
    if (!isQuestionInQuiz) {
      return res.status(400).json({
        success: false,
        message: 'Question does not belong to this quiz.',
      });
    }

    const attempt = await QuestionAttempt.findOne({ quizId, questionId });
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Question attempt record not found for this quiz.',
      });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    const parsedOption = selectedOption !== null && selectedOption !== undefined ? Number(selectedOption) : null;

    if (parsedOption !== null && (parsedOption < 0 || parsedOption >= question.options.length)) {
      return res.status(400).json({ success: false, message: 'Invalid option selected.' });
    }

    // Calculate correctness
    const isCorrect = parsedOption !== null && parsedOption === question.correctOptionIndex;

    // Determine mistake classification
    let finalMistakeType = 'none';
    if (parsedOption === null) {
      finalMistakeType = 'unattempted';
    } else if (!isCorrect) {
      const validMistakeTypes = ['conceptual', 'careless', 'time_pressure'];
      finalMistakeType = validMistakeTypes.includes(mistakeType) ? mistakeType : 'conceptual';
    }

    attempt.selectedOption = parsedOption;
    attempt.isCorrect = isCorrect;
    attempt.timeSpentSeconds = Math.max(0, Number(timeSpentSeconds) || attempt.timeSpentSeconds || 0);
    attempt.mistakeType = finalMistakeType;
    attempt.attemptedAt = new Date();
    await attempt.save();

    // Response strictly avoids revealing the correct option
    return res.status(200).json({
      success: true,
      message: 'Answer recorded successfully.',
      data: {
        quizId,
        questionId,
        selectedOption: attempt.selectedOption,
        timeSpentSeconds: attempt.timeSpentSeconds,
      },
    });
  } catch (error) {
    console.error('[AnswerQuestion Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record answer.',
    });
  }
};

/**
 * @desc    Submit quiz, calculate final score, and aggregate telemetry
 * @route   POST /api/v1/quizzes/:quizId/submit
 * @access  Private
 */
export const submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!mongoose.isValidObjectId(quizId)) {
      return res.status(400).json({ success: false, message: 'Invalid quizId format.' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    // Ownership check
    if (quiz.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this quiz.' });
    }

    // Prevent duplicate submission
    if (quiz.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Quiz has already been submitted.',
      });
    }

    // Fetch all attempt records for this quiz
    const attempts = await QuestionAttempt.find({ quizId }).populate('topicId', 'name');

    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let unanswered = 0;
    let totalTimeSeconds = 0;

    const topicMap = {};
    const diffMap = {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 },
    };

    for (const att of attempts) {
      totalTimeSeconds += att.timeSpentSeconds || 0;

      // Difficulty telemetry
      const diff = att.difficulty || 'medium';
      if (!diffMap[diff]) diffMap[diff] = { total: 0, correct: 0 };
      diffMap[diff].total += 1;

      // Topic telemetry
      const tId = att.topicId?._id?.toString() || att.topicId?.toString();
      const tName = att.topicId?.name || 'General';
      if (!topicMap[tId]) {
        topicMap[tId] = { topicId: tId, topicName: tName, total: 0, correct: 0 };
      }
      topicMap[tId].total += 1;

      if (att.selectedOption === null) {
        unanswered += 1;
        att.isCorrect = false;
        att.mistakeType = 'unattempted';
        await att.save();
      } else if (att.isCorrect) {
        correctAnswers += 1;
        diffMap[diff].correct += 1;
        topicMap[tId].correct += 1;
      } else {
        incorrectAnswers += 1;
      }
    }

    const totalQuestions = attempts.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100 * 10) / 10 : 0;
    const score = correctAnswers;

    // Build structured telemetry breakdowns
    const topicPerformance = Object.values(topicMap).map((t) => ({
      topicId: t.topicId,
      topicName: t.topicName,
      total: t.total,
      correct: t.correct,
      accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100 * 10) / 10 : 0,
    }));

    const difficultyPerformance = Object.entries(diffMap).map(([difficulty, d]) => ({
      difficulty,
      total: d.total,
      correct: d.correct,
      accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100 * 10) / 10 : 0,
    }));

    // Update Quiz record
    quiz.status = 'completed';
    quiz.completedAt = new Date();
    quiz.totalQuestions = totalQuestions;
    quiz.score = score;
    quiz.correctAnswers = correctAnswers;
    quiz.incorrectAnswers = incorrectAnswers;
    quiz.unanswered = unanswered;
    quiz.accuracy = accuracy;
    quiz.totalTimeSeconds = totalTimeSeconds;
    quiz.topicPerformance = topicPerformance;
    quiz.difficultyPerformance = difficultyPerformance;
    await quiz.save();

    // Automatically recalculate and update student's digital twin mastery profile
    await recalculateStudentMastery(quiz.userId);

    return res.status(200).json({
      success: true,
      message: 'Quiz submitted and evaluated successfully.',
      data: {
        quizId: quiz._id,
        status: quiz.status,
        score: quiz.score,
        totalQuestions: quiz.totalQuestions,
        correctAnswers: quiz.correctAnswers,
        incorrectAnswers: quiz.incorrectAnswers,
        unanswered: quiz.unanswered,
        accuracy: quiz.accuracy,
        totalTimeSeconds: quiz.totalTimeSeconds,
        topicPerformance: quiz.topicPerformance,
        difficultyPerformance: quiz.difficultyPerformance,
        completedAt: quiz.completedAt,
      },
    });
  } catch (error) {
    console.error('[SubmitQuiz Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit quiz.',
    });
  }
};

/**
 * @desc    Get detailed quiz result with explanations and question-level review
 * @route   GET /api/v1/quizzes/:quizId/result
 * @access  Private
 */
export const getQuizResult = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!mongoose.isValidObjectId(quizId)) {
      return res.status(400).json({ success: false, message: 'Invalid quizId format.' });
    }

    const quiz = await Quiz.findById(quizId).populate('subjectId', 'name').populate('topicId', 'name');
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    // Ownership check
    if (quiz.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this quiz result.' });
    }

    // Must be completed
    if (quiz.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Quiz has not been completed yet.',
      });
    }

    // Fetch full attempts with explanations and question texts
    const attempts = await QuestionAttempt.find({ quizId })
      .populate('questionId', 'questionText options correctOptionIndex explanation difficulty')
      .populate('topicId', 'name');

    const detailedAttempts = attempts.map((att) => ({
      questionId: att.questionId?._id,
      questionText: att.questionId?.questionText,
      options: att.questionId?.options,
      topicName: att.topicId?.name,
      difficulty: att.difficulty,
      selectedOption: att.selectedOption,
      correctOption: att.correctOption,
      isCorrect: att.isCorrect,
      timeSpentSeconds: att.timeSpentSeconds,
      mistakeType: att.mistakeType,
      explanation: att.questionId?.explanation,
    }));

    return res.status(200).json({
      success: true,
      data: {
        quiz: {
          _id: quiz._id,
          status: quiz.status,
          score: quiz.score,
          totalQuestions: quiz.totalQuestions,
          correctAnswers: quiz.correctAnswers,
          incorrectAnswers: quiz.incorrectAnswers,
          unanswered: quiz.unanswered,
          accuracy: quiz.accuracy,
          totalTimeSeconds: quiz.totalTimeSeconds,
          topicPerformance: quiz.topicPerformance,
          difficultyPerformance: quiz.difficultyPerformance,
          startedAt: quiz.startedAt,
          completedAt: quiz.completedAt,
        },
        attempts: detailedAttempts,
      },
    });
  } catch (error) {
    console.error('[GetQuizResult Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve quiz result.',
    });
  }
};

/**
 * @desc    Get user's past quiz history
 * @route   GET /api/v1/quizzes/history
 * @access  Private
 */
export const getQuizHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { userId: req.user._id, status: 'completed' };

    const total = await Quiz.countDocuments(query);
    const quizzes = await Quiz.find(query)
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('subjectId', 'name')
      .populate('topicId', 'name')
      .select('-questions');

    return res.status(200).json({
      success: true,
      count: quizzes.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: quizzes,
    });
  } catch (error) {
    console.error('[GetQuizHistory Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve quiz history.',
    });
  }
};
