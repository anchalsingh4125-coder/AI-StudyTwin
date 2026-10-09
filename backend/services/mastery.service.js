import mongoose from 'mongoose';
import QuestionAttempt from '../models/questionAttempt.model.js';
import StudentTwinProfile from '../models/studentTwinProfile.model.js';
import {
  DIFFICULTY_WEIGHTS,
  MASTERY_FORMULA_CONFIG,
  classifyMastery,
} from '../config/mastery.config.js';

export { classifyMastery };

/**
 * Calculate the deterministic mastery score (0-100) for a given set of attempts on a topic.
 *
 * Algorithm factors:
 * 1. Difficulty-weighted accuracy: Easy(1.0), Medium(1.5), Hard(2.0).
 * 2. Recency bias: Recent attempts receive higher linear weighting.
 * 3. Confidence/Volume scaling: Fewer than 5 attempts are anchored towards a neutral prior (40).
 * 4. Time efficiency: Quick & accurate (+3), excessive latency / struggling (-3).
 * 5. Repeated mistake deductions: Penalties for conceptual and careless error density.
 *
 * @param {Array} attempts - Chronologically ordered QuestionAttempt documents
 * @returns {number} Mastery score rounded to 1 decimal place (0 to 100)
 */
export const calculateTopicMasteryScore = (attempts) => {
  if (!attempts || attempts.length === 0) return 0;

  const count = attempts.length;

  // 1. Difficulty-Weighted Accuracy
  let totalDiffWeight = 0;
  let earnedDiffWeight = 0;
  for (const att of attempts) {
    const diff = att.difficulty || 'medium';
    const weight = DIFFICULTY_WEIGHTS[diff] || 1.0;
    totalDiffWeight += weight;
    if (att.isCorrect) earnedDiffWeight += weight;
  }
  const weightedAccuracy = totalDiffWeight > 0 ? (earnedDiffWeight / totalDiffWeight) * 100 : 0;

  // 2. Recency-Biased Accuracy (last 5 attempts)
  const recentWindow = attempts.slice(-5);
  let recentWeightSum = 0;
  let recentEarnedSum = 0;
  recentWindow.forEach((att, idx) => {
    const recencyWeight = 1.0 + idx * MASTERY_FORMULA_CONFIG.recencyWeightDecay;
    recentWeightSum += recencyWeight;
    if (att.isCorrect) recentEarnedSum += recencyWeight;
  });
  const recentAccuracy = recentWeightSum > 0 ? (recentEarnedSum / recentWeightSum) * 100 : weightedAccuracy;
  const blendedAccuracy = 0.6 * recentAccuracy + 0.4 * weightedAccuracy;

  // 3. Volume / Confidence Scaling (Bayesian-inspired shrinkage towards neutral prior)
  const confidence = Math.min(1.0, count / MASTERY_FORMULA_CONFIG.minConfidenceAttempts);
  const confidenceAdjustedScore =
    blendedAccuracy * confidence + MASTERY_FORMULA_CONFIG.neutralPriorScore * (1.0 - confidence);

  // 4. Time Efficiency Modifier
  const avgTime = count > 0 ? attempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0) / count : 0;
  let timeAdjustment = 0;
  if (avgTime <= MASTERY_FORMULA_CONFIG.timeIdealThresholds.fastWithAccuracy && blendedAccuracy >= 70) {
    timeAdjustment = 3; // Fast and accurate bonus
  } else if (avgTime >= MASTERY_FORMULA_CONFIG.timeIdealThresholds.strugglingTime) {
    timeAdjustment = -3; // Latency penalty
  }

  // 5. Repeated Mistake Deductions
  const conceptualMistakes = attempts.filter((a) => !a.isCorrect && a.mistakeType === 'conceptual').length;
  const carelessMistakes = attempts.filter((a) => !a.isCorrect && a.mistakeType === 'careless').length;
  const mistakePenalty = Math.min(
    MASTERY_FORMULA_CONFIG.mistakePenalties.maxPenalty,
    conceptualMistakes * MASTERY_FORMULA_CONFIG.mistakePenalties.conceptual +
      carelessMistakes * MASTERY_FORMULA_CONFIG.mistakePenalties.careless
  );

  // 6. Aggregate & clamp score to [0, 100]
  const rawScore = confidenceAdjustedScore + timeAdjustment - mistakePenalty;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  return finalScore;
};

/**
 * Recompute topic mastery and overall readiness for a given student.
 * Preserves historical attempts and updates student_twin_profiles.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Document>} Updated StudentTwinProfile
 */
export const recalculateStudentMastery = async (userId) => {
  const objectUserId = new mongoose.Types.ObjectId(userId);

  // Retrieve all historical attempts for the user, sorted chronologically
  const attempts = await QuestionAttempt.find({ userId: objectUserId }).sort({ attemptedAt: 1 });

  // Group attempts by topicId
  const topicMap = new Map();
  for (const att of attempts) {
    const topicIdStr = att.topicId.toString();
    if (!topicMap.has(topicIdStr)) {
      topicMap.set(topicIdStr, []);
    }
    topicMap.get(topicIdStr).push(att);
  }

  // Build topicMastery array
  const topicMastery = [];
  for (const [topicIdStr, topicAttempts] of topicMap.entries()) {
    const attemptsCount = topicAttempts.length;
    const correctCount = topicAttempts.filter((a) => a.isCorrect).length;
    const accuracy = attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100 * 10) / 10 : 0;
    const totalTime = topicAttempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0);
    const averageTimeSeconds = attemptsCount > 0 ? Math.round(totalTime / attemptsCount) : 0;
    const lastPracticed = topicAttempts[topicAttempts.length - 1].attemptedAt;

    const masteryScore = calculateTopicMasteryScore(topicAttempts);

    topicMastery.push({
      topicId: new mongoose.Types.ObjectId(topicIdStr),
      masteryScore,
      attemptsCount,
      correctCount,
      accuracy,
      averageTimeSeconds,
      lastPracticed,
    });
  }

  // Detect repeated mistakes pattern
  const mistakeGrouping = new Map();
  for (const att of attempts) {
    if (!att.isCorrect && att.mistakeType && att.mistakeType !== 'none' && att.mistakeType !== 'unattempted') {
      const key = `${att.mistakeType}_${att.topicId.toString()}`;
      if (!mistakeGrouping.has(key)) {
        mistakeGrouping.set(key, {
          mistakeType: att.mistakeType,
          topicId: att.topicId,
          count: 0,
          lastEncountered: att.attemptedAt,
        });
      }
      const record = mistakeGrouping.get(key);
      record.count += 1;
      if (att.attemptedAt > record.lastEncountered) {
        record.lastEncountered = att.attemptedAt;
      }
    }
  }
  const repeatedMistakes = Array.from(mistakeGrouping.values());

  // Calculate overall readiness score
  let overallReadinessScore = 0;
  if (topicMastery.length > 0) {
    const sumMastery = topicMastery.reduce((sum, t) => sum + t.masteryScore, 0);
    overallReadinessScore = Math.round((sumMastery / topicMastery.length) * 10) / 10;
  }

  // Upsert StudentTwinProfile
  const profile = await StudentTwinProfile.findOneAndUpdate(
    { userId: objectUserId },
    {
      userId: objectUserId,
      overallReadinessScore,
      topicMastery,
      repeatedMistakes,
      lastUpdated: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return profile;
};

export default {
  calculateTopicMasteryScore,
  recalculateStudentMastery,
  classifyMastery,
};
