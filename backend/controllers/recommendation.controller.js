import AiRecommendation from '../models/aiRecommendation.model.js';
import { generateStudentRecommendations } from '../services/recommendation.service.js';

/**
 * Format recommendation document to match strict user-facing schema
 */
const formatRecommendationResponse = (rec) => ({
  _id: rec._id,
  diagnosisSummary: rec.diagnosisSummary,
  weakTopics: rec.weakTopics,
  strongTopics: rec.strongTopics,
  actionItems: rec.actionItems.map((item) => ({
    priority: item.priority,
    topicId: item.topicId.toString(),
    topicName: item.topicName,
    recommendedAction: item.recommendedAction,
    rationale: item.rationale,
    estimatedMinutes: item.estimatedMinutes,
    practiceQuestionCount: item.practiceQuestionCount,
  })),
  createdAt: rec.createdAt,
});

/**
 * @desc    Generate a fresh personalized recommendation snapshot
 * @route   POST /api/v1/ai/recommendations
 * @access  Private
 */
export const createRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const record = await generateStudentRecommendations(userId);

    return res.status(201).json({
      success: true,
      message: 'Personalized recommendations generated successfully.',
      data: {
        recommendations: formatRecommendationResponse(record),
      },
    });
  } catch (error) {
    console.error('[CreateRecommendations Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations.',
    });
  }
};

/**
 * @desc    Get the latest recommendation snapshot for the student
 * @route   GET /api/v1/ai/recommendations
 * @access  Private
 */
export const getLatestRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    let latest = await AiRecommendation.findOne({ userId }).sort({ createdAt: -1 });

    // If no snapshot exists yet, generate on-demand
    if (!latest) {
      latest = await generateStudentRecommendations(userId);
    }

    return res.status(200).json({
      success: true,
      data: {
        recommendations: formatRecommendationResponse(latest),
      },
    });
  } catch (error) {
    console.error('[GetLatestRecommendations Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recommendations.',
    });
  }
};

/**
 * @desc    Get historical recommendation snapshots for the student
 * @route   GET /api/v1/ai/recommendations/history
 * @access  Private
 */
export const getRecommendationHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const history = await AiRecommendation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      count: history.length,
      data: {
        history: history.map(formatRecommendationResponse),
      },
    });
  } catch (error) {
    console.error('[GetRecommendationHistory Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recommendation history.',
    });
  }
};
