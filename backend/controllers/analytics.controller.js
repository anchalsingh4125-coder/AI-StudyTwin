import mongoose from 'mongoose';
import StudentTwinProfile from '../models/studentTwinProfile.model.js';
import Quiz from '../models/quiz.model.js';
import QuestionAttempt from '../models/questionAttempt.model.js';
import Topic from '../models/topic.model.js';
import Subject from '../models/subject.model.js';
import { recalculateStudentMastery } from '../services/mastery.service.js';
import { classifyMastery, MASTERY_THRESHOLDS } from '../config/mastery.config.js';

/**
 * Ensure student twin profile exists; create/calculate if not yet generated
 */
const getOrComputeProfile = async (userId) => {
  let profile = await StudentTwinProfile.findOne({ userId });
  if (!profile) {
    profile = await recalculateStudentMastery(userId);
  }
  return profile;
};

/**
 * @desc    Get high-level student analytics overview & performance trends
 * @route   GET /api/v1/analytics/overview
 * @access  Private
 */
export const getOverview = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await getOrComputeProfile(userId);

    const totalQuizzes = await Quiz.countDocuments({ userId, status: 'completed' });
    const recentQuizzes = await Quiz.find({ userId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(10)
      .select('score totalQuestions accuracy totalTimeSeconds completedAt')
      .lean();

    const attempts = await QuestionAttempt.find({ userId });
    const totalQuestions = attempts.length;
    const totalCorrect = attempts.filter((a) => a.isCorrect).length;
    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100 * 10) / 10 : 0;
    const totalTime = attempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0);
    const averageQuestionTime = totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0;

    // Classify topic counts
    const topicCounts = {
      weak: 0,
      developing: 0,
      strong: 0,
      mastered: 0,
    };

    for (const tm of profile.topicMastery) {
      const tier = classifyMastery(tm.masteryScore);
      topicCounts[tier] += 1;
    }

    return res.status(200).json({
      success: true,
      data: {
        overallReadinessScore: profile.overallReadinessScore,
        totalQuizzesCompleted: totalQuizzes,
        totalQuestionsAttempted: totalQuestions,
        overallAccuracy,
        averageQuestionTimeSeconds: averageQuestionTime,
        topicCountsByTier: topicCounts,
        recentPerformanceTrend: recentQuizzes,
      },
    });
  } catch (error) {
    console.error('[GetOverview Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics overview.',
    });
  }
};

/**
 * @desc    Get granular topic-by-topic mastery breakdown and strong/weak categorisation
 * @route   GET /api/v1/analytics/topics
 * @access  Private
 */
export const getTopicAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await getOrComputeProfile(userId);

    // Populate topic and subject details
    const topicIds = profile.topicMastery.map((tm) => tm.topicId);
    const topicsInfo = await Topic.find({ _id: { $in: topicIds } })
      .populate('subjectId', 'name')
      .lean();

    const topicInfoMap = new Map();
    topicsInfo.forEach((t) => topicInfoMap.set(t._id.toString(), t));

    const enrichedTopics = profile.topicMastery.map((tm) => {
      const info = topicInfoMap.get(tm.topicId.toString());
      const tier = classifyMastery(tm.masteryScore);
      return {
        topicId: tm.topicId,
        topicName: info?.name || 'Unknown Topic',
        subjectName: info?.subjectId?.name || 'General',
        masteryScore: tm.masteryScore,
        tier,
        tierLabel: MASTERY_THRESHOLDS[tier.toUpperCase()]?.label || tier,
        attemptsCount: tm.attemptsCount,
        correctCount: tm.correctCount,
        accuracy: tm.accuracy,
        averageTimeSeconds: tm.averageTimeSeconds,
        lastPracticed: tm.lastPracticed,
      };
    });

    // Group topics into categorised lists
    const grouped = {
      weak: enrichedTopics.filter((t) => t.tier === 'weak'),
      developing: enrichedTopics.filter((t) => t.tier === 'developing'),
      strong: enrichedTopics.filter((t) => t.tier === 'strong'),
      mastered: enrichedTopics.filter((t) => t.tier === 'mastered'),
    };

    return res.status(200).json({
      success: true,
      count: enrichedTopics.length,
      data: {
        allTopics: enrichedTopics,
        grouped,
      },
    });
  } catch (error) {
    console.error('[GetTopicAnalytics Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve topic analytics.',
    });
  }
};

/**
 * @desc    Get analysis of repeated mistake types and vulnerable topic spots
 * @route   GET /api/v1/analytics/mistakes
 * @access  Private
 */
export const getMistakeAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await getOrComputeProfile(userId);

    const topicIds = profile.repeatedMistakes.map((rm) => rm.topicId);
    const topics = await Topic.find({ _id: { $in: topicIds } }).lean();
    const topicMap = new Map();
    topics.forEach((t) => topicMap.set(t._id.toString(), t.name));

    const distribution = {
      conceptual: 0,
      careless: 0,
      time_pressure: 0,
      unattempted: 0,
    };

    let totalMistakes = 0;
    const enrichedPatterns = profile.repeatedMistakes.map((rm) => {
      const count = rm.count || 0;
      totalMistakes += count;
      if (distribution[rm.mistakeType] !== undefined) {
        distribution[rm.mistakeType] += count;
      }

      return {
        mistakeType: rm.mistakeType,
        topicId: rm.topicId,
        topicName: topicMap.get(rm.topicId.toString()) || 'Unknown Topic',
        count: rm.count,
        lastEncountered: rm.lastEncountered,
      };
    });

    // Sort patterns by frequency (most repeated first)
    enrichedPatterns.sort((a, b) => b.count - a.count);

    return res.status(200).json({
      success: true,
      data: {
        totalMistakesRecorded: totalMistakes,
        mistakeTypeDistribution: distribution,
        repeatedMistakePatterns: enrichedPatterns,
      },
    });
  } catch (error) {
    console.error('[GetMistakeAnalytics Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve mistake analytics.',
    });
  }
};

/**
 * @desc    Get overall exam readiness evaluation and curriculum coverage metrics
 * @route   GET /api/v1/analytics/readiness
 * @access  Private
 */
export const getReadinessAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await getOrComputeProfile(userId);

    const totalCurriculumTopics = await Topic.countDocuments();
    const topicsPracticed = profile.topicMastery.length;
    const coveragePercentage =
      totalCurriculumTopics > 0
        ? Math.round((topicsPracticed / totalCurriculumTopics) * 100 * 10) / 10
        : 0;

    let readinessTier = 'Needs Remediation';
    const score = profile.overallReadinessScore;
    if (score >= 85) readinessTier = 'Mastery Achieved';
    else if (score >= 70) readinessTier = 'Exam Ready';
    else if (score >= 40) readinessTier = 'Developing Competence';

    return res.status(200).json({
      success: true,
      data: {
        readinessScore: profile.overallReadinessScore,
        readinessTier,
        curriculumCoverage: {
          totalTopicsInCurriculum: totalCurriculumTopics,
          topicsPracticed,
          coveragePercentage,
        },
        lastUpdated: profile.lastUpdated,
      },
    });
  } catch (error) {
    console.error('[GetReadinessAnalytics Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve readiness metrics.',
    });
  }
};
