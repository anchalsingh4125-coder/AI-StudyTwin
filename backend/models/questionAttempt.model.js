import mongoose from 'mongoose';

const questionAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz ID is required'],
      index: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question ID is required'],
      index: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: [true, 'Topic ID is required'],
      index: true,
    },
    selectedOption: {
      type: Number,
      default: null, // null indicates unanswered
    },
    correctOption: {
      type: Number,
      required: [true, 'Correct option index is required'],
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: [0, 'Time spent cannot be negative'],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: [true, 'Difficulty level is required'],
    },
    mistakeType: {
      type: String,
      enum: ['conceptual', 'careless', 'time_pressure', 'unattempted', 'none'],
      default: 'unattempted',
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per question in a quiz
questionAttemptSchema.index({ quizId: 1, questionId: 1 }, { unique: true });

const QuestionAttempt = mongoose.model('QuestionAttempt', questionAttemptSchema);

export default QuestionAttempt;
