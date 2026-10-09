import StudentTwinProfile from '../models/studentTwinProfile.model.js';
import Quiz from '../models/quiz.model.js';
import Topic from '../models/topic.model.js';
import { recalculateStudentMastery } from '../services/mastery.service.js';

/**
 * @desc    Generate an AI-powered diagnostic assessment for the authenticated student
 * @route   POST /api/v1/ai/diagnose
 * @access  Private
 */
export const diagnoseStudent = async (req, res) => {
  try {
    const userId = req.user._id;

    // Retrieve or initialize student's cognitive twin profile
    let profile = await StudentTwinProfile.findOne({ userId });
    if (!profile) {
      profile = await recalculateStudentMastery(userId);
    }

    // Populate topic names for mastery items
    const topicIds = profile.topicMastery.map((tm) => tm.topicId);
    const topics = await Topic.find({ _id: { $in: topicIds } }).lean();
    const topicNameMap = new Map(topics.map((t) => [t._id.toString(), t.name]));

    const topicMasteryPayload = profile.topicMastery.map((tm) => ({
      topicId: tm.topicId.toString(),
      topicName: topicNameMap.get(tm.topicId.toString()) || 'Unknown Topic',
      masteryScore: tm.masteryScore,
      accuracy: tm.accuracy,
      attemptsCount: tm.attemptsCount,
      averageTimeSeconds: tm.averageTimeSeconds,
      lastPracticed: tm.lastPracticed ? tm.lastPracticed.toISOString() : null,
    }));

    // Populate topic names for repeated mistakes
    const mistakeTopicIds = profile.repeatedMistakes.map((rm) => rm.topicId);
    const mistakeTopics = await Topic.find({ _id: { $in: mistakeTopicIds } }).lean();
    const mistakeTopicMap = new Map(mistakeTopics.map((t) => [t._id.toString(), t.name]));

    const repeatedMistakesPayload = profile.repeatedMistakes.map((rm) => ({
      mistakeType: rm.mistakeType,
      topicId: rm.topicId.toString(),
      topicName: mistakeTopicMap.get(rm.topicId.toString()) || 'Unknown Topic',
      count: rm.count,
      lastEncountered: rm.lastEncountered ? rm.lastEncountered.toISOString() : null,
    }));

    // Retrieve recent completed quizzes
    const recentQuizzes = await Quiz.find({ userId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(5)
      .lean();

    const recentQuizPayload = recentQuizzes.map((q) => ({
      score: q.score,
      accuracy: q.accuracy,
      totalTimeSeconds: q.totalTimeSeconds,
      completedAt: q.completedAt ? q.completedAt.toISOString() : null,
    }));

    // Construct telemetry payload for AI microservice
    const diagnosisPayload = {
      overallReadinessScore: profile.overallReadinessScore,
      topicMastery: topicMasteryPayload,
      repeatedMistakes: repeatedMistakesPayload,
      recentQuizPerformance: recentQuizPayload,
    };

    // Forward to FastAPI AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    let aiResponse;
    try {
      const response = await fetch(`${aiServiceUrl}/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagnosisPayload),
        signal: AbortSignal.timeout(10000), // 10s timeout budget
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI service responded with HTTP ${response.status}: ${errorText}`);
      }

      aiResponse = await response.json();
    } catch (fetchError) {
      console.error('[AI Controller Error] Communication with AI Service failed:', fetchError.message);
      return res.status(502).json({
        success: false,
        message: 'AI Diagnostic service is temporarily unavailable or timed out.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        diagnosis: aiResponse,
      },
    });
  } catch (error) {
    console.error('[DiagnoseStudent Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate AI diagnosis.',
    });
  }
};
