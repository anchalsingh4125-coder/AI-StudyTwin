import mongoose from 'mongoose';

const actionItemSchema = new mongoose.Schema(
  {
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
    topicName: {
      type: String,
      required: true,
      trim: true,
    },
    recommendedAction: {
      type: String,
      required: true,
      trim: true,
    },
    rationale: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedMinutes: {
      type: Number,
      required: true,
      min: 5,
      default: 20,
    },
    practiceQuestionCount: {
      type: Number,
      required: true,
      min: 1,
      default: 5,
    },
  },
  { _id: false }
);

const aiRecommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    diagnosisId: {
      type: String,
      default: null,
    },
    diagnosisSummary: {
      type: String,
      required: true,
      trim: true,
    },
    weakTopics: {
      type: [String],
      default: [],
    },
    strongTopics: {
      type: [String],
      default: [],
    },
    actionItems: {
      type: [actionItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length <= 5;
        },
        message: 'A recommendation snapshot cannot exceed 5 action items.',
      },
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'ai_recommendations',
  }
);

// Index for high-performance retrieval of latest recommendation snapshot
aiRecommendationSchema.index({ userId: 1, createdAt: -1 });

const AiRecommendation = mongoose.model('AiRecommendation', aiRecommendationSchema);

export default AiRecommendation;
