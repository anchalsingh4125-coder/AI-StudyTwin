import mongoose from 'mongoose';

const topicMasterySchema = new mongoose.Schema(
  {
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
    masteryScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    attemptsCount: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0, // Percentage 0 - 100
    },
    averageTimeSeconds: {
      type: Number,
      default: 0,
    },
    lastPracticed: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const repeatedMistakeSchema = new mongoose.Schema(
  {
    mistakeType: {
      type: String,
      enum: ['conceptual', 'careless', 'time_pressure', 'unattempted'],
      required: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
    count: {
      type: Number,
      default: 1,
    },
    lastEncountered: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const studentTwinProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    overallReadinessScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    topicMastery: [topicMasterySchema],
    repeatedMistakes: [repeatedMistakeSchema],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'student_twin_profiles',
  }
);

const StudentTwinProfile = mongoose.model('StudentTwinProfile', studentTwinProfileSchema);

export default StudentTwinProfile;
