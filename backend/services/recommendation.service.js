import mongoose from 'mongoose';
import AiRecommendation from '../models/aiRecommendation.model.js';
import StudentTwinProfile from '../models/studentTwinProfile.model.js';
import Quiz from '../models/quiz.model.js';
import Topic from '../models/topic.model.js';
import { recalculateStudentMastery } from './mastery.service.js';

/**
 * Fetch or generate AI diagnosis for a student with deterministic fallback.
 * @param {object} diagnosisPayload
 * @returns {Promise<object>} Structured diagnosis
 */
export const fetchAiDiagnosisWithFallback = async (diagnosisPayload) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  try {
    const response = await fetch(`${aiServiceUrl}/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(diagnosisPayload),
      signal: AbortSignal.timeout(6000), // 6s timeout budget
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn(`[Recommendation Engine] AI service unreachable (${err.message}). Using local fallback engine.`);
  }

  // Fallback diagnosis generation logic directly in Node
  const weak = [];
  const developing = [];
  const strong = [];

  for (const tm of diagnosisPayload.topicMastery) {
    if (tm.masteryScore < 40) weak.push(tm.topicName);
    else if (tm.masteryScore < 70) developing.push(tm.topicName);
    else strong.push(tm.topicName);
  }

  const repeatedErrorPatterns = diagnosisPayload.repeatedMistakes.map(
    (m) => `${m.count} ${m.mistakeType} mistake(s) on ${m.topicName}`
  );

  const readiness = diagnosisPayload.overallReadinessScore;
  const learningRisk = readiness < 50 || weak.length > 0 ? 'high' : readiness < 75 ? 'medium' : 'low';

  let diagnosisSummary = `Student has an overall readiness of ${readiness}%. `;
  if (weak.length > 0) {
    diagnosisSummary += `Critical focus required on weak topics: ${weak.join(', ')}.`;
  } else if (developing.length > 0) {
    diagnosisSummary += `Steady progress observed. Reinforce developing areas: ${developing.join(', ')}.`;
  } else {
    diagnosisSummary += `Consistent mastery demonstrated across active curriculum topics.`;
  }

  return {
    diagnosisSummary,
    weakTopics: weak,
    strongTopics: strong,
    developingTopics: developing,
    repeatedErrorPatterns,
    learningRisk,
    immediatePriorities: weak.length > 0 ? [`Review ${weak[0]}`] : ['Maintain curriculum practice'],
    reasoning: [`Readiness score is ${readiness}%`, `Identified ${weak.length} weak and ${strong.length} strong topics`],
  };
};

/**
 * Generate adaptive, personalized study action items based on student metrics.
 *
 * Rules Applied:
 * 1. Mastery < 40 -> High priority remedial practice
 * 2. Mastery 40-69 -> Medium priority reinforcement
 * 3. Mastery >= 70 -> Maintenance / challenge practice
 * 4. Repeated mistakes -> Escalates priority to High with mistake remediation
 * 5. Low accuracy (<50%) + High time (>60s) -> Conceptual deep-dive
 * 6. Low accuracy (<50%) + Low time (<20s) -> Paced deliberation practice
 * 7. High accuracy (>=75%) + High time (>60s) -> Speed & pacing sprint
 * 8. Stale practice (> 7 days or oldest topic) -> Spaced repetition revision
 * 9. Deduplicated by topicId and capped at max 5 action items
 *
 * @param {object} params
 * @returns {Array<object>} Up to 5 sorted action items
 */
export const generateAdaptiveActionItems = ({ topicMastery, repeatedMistakes, diagnosis }) => {
  const candidateActions = [];
  const now = new Date();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  // Map mistakes by topicId
  const mistakeMap = new Map();
  for (const m of repeatedMistakes) {
    mistakeMap.set(m.topicId.toString(), m);
  }

  for (const tm of topicMastery) {
    const topicIdStr = tm.topicId.toString();
    const topicName = tm.topicName;
    const score = tm.masteryScore;
    const accuracy = tm.accuracy;
    const avgTime = tm.averageTimeSeconds;
    const mistake = mistakeMap.get(topicIdStr);

    let priority = score < 40 ? 'high' : score < 70 ? 'medium' : 'low';
    let recommendedAction = '';
    let rationale = '';
    let estimatedMinutes = 20;
    let practiceQuestionCount = 5;

    // Rule 1: Repeated mistake escalation
    if (mistake && mistake.count >= 2) {
      priority = 'high';
      recommendedAction = `Targeted Misconception Drill: Retry 5 practice questions addressing recurring ${mistake.mistakeType} errors`;
      rationale = `Detected ${mistake.count} repeated ${mistake.mistakeType} mistakes on this topic. Direct practice targeting this blind spot prevents compounding misconceptions.`;
      estimatedMinutes = 25;
      practiceQuestionCount = 5;
    }
    // Rule 2: Low accuracy + High time spent (Conceptual confusion)
    else if (accuracy < 50 && avgTime > 60) {
      priority = 'high';
      recommendedAction = `Conceptual Deep Dive: Review core theory and worked examples, then solve 3 easy questions`;
      rationale = `Average response time is high (${avgTime}s) alongside low accuracy (${accuracy}%), indicating hesitation and fundamental conceptual gaps rather than rushing.`;
      estimatedMinutes = 30;
      practiceQuestionCount = 3;
    }
    // Rule 3: Low accuracy + Low time spent (Careless rushing)
    else if (accuracy < 50 && avgTime > 0 && avgTime < 20) {
      priority = 'high';
      recommendedAction = `Paced Deliberation Drill: Solve 5 easy questions with deliberate reading and elimination`;
      rationale = `Low response time (${avgTime}s) coupled with poor accuracy (${accuracy}%) points to careless answering or guesswork. Slowing down will instantly raise scores.`;
      estimatedMinutes = 20;
      practiceQuestionCount = 5;
    }
    // Rule 4: High accuracy + High time spent (Lacks speed / automaticity)
    else if (accuracy >= 75 && avgTime > 60) {
      priority = 'medium';
      recommendedAction = `Speed & Pacing Sprint: Complete 5 medium questions with strict 45-second per-question timer`;
      rationale = `Accuracy is solid (${accuracy}%), but high response latency (${avgTime}s) will cause exam time pressure. Speed drills will build pattern recognition.`;
      estimatedMinutes = 15;
      practiceQuestionCount = 5;
    }
    // Rule 5: Weak topic baseline (score < 40)
    else if (score < 40) {
      priority = 'high';
      recommendedAction = `Foundational Reinforcement: Practice 5 easy questions to rebuild core comprehension`;
      rationale = `Mastery score is in the critical zone (${score}/100). Starting with easy-tier problems establishes foundational competence.`;
      estimatedMinutes = 25;
      practiceQuestionCount = 5;
    }
    // Rule 6: Developing topic baseline (40 - 69)
    else if (score < 70) {
      priority = 'medium';
      recommendedAction = `Skill Progression: Solve 5 medium-difficulty questions to push mastery into the strong tier`;
      rationale = `Mastery is developing (${score}/100). Tackling standard exam-level questions will bridge the gap to full mastery.`;
      estimatedMinutes = 20;
      practiceQuestionCount = 5;
    }
    // Rule 7: High mastery (>= 70)
    else {
      priority = 'low';
      recommendedAction = `Mastery Challenge: Attempt 5 hard questions to test edge cases and cement retention`;
      rationale = `Strong mastery demonstrated (${score}/100). Hard problems solidify deep intuition and prepare for advanced examination variations.`;
      estimatedMinutes = 25;
      practiceQuestionCount = 5;
    }

    // Check for recency / staleness: if last practiced > 7 days ago
    if (tm.lastPracticed) {
      const daysSince = (now.getTime() - new Date(tm.lastPracticed).getTime()) / SEVEN_DAYS_MS;
      if (daysSince >= 1.0 && priority === 'low') {
        recommendedAction = `Spaced Repetition Refresher: Solve 3 maintenance questions to prevent retention decay`;
        rationale = `Topic has not been practiced in over 7 days. Periodic spaced review protects against natural memory curve decay.`;
        estimatedMinutes = 15;
        practiceQuestionCount = 3;
      }
    }

    candidateActions.push({
      priority,
      topicId: tm.topicId,
      topicName,
      recommendedAction,
      rationale,
      estimatedMinutes,
      practiceQuestionCount,
      masteryScore: score,
    });
  }

  // Priority ranking weights
  const priorityWeight = { high: 3, medium: 2, low: 1 };

  // Sort candidate actions: High priority first, then lowest mastery score (highest learning impact)
  candidateActions.sort((a, b) => {
    const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (weightDiff !== 0) return weightDiff;
    return a.masteryScore - b.masteryScore; // lower score = higher urgency
  });

  // Deduplicate by topicId (guaranteed 1 action per topic)
  const seenTopicIds = new Set();
  const deduplicatedActions = [];

  for (const item of candidateActions) {
    const tId = item.topicId.toString();
    if (!seenTopicIds.has(tId)) {
      seenTopicIds.add(tId);
      // Clean up internal sorting helper before returning
      const { masteryScore, ...actionData } = item;
      deduplicatedActions.push(actionData);
    }
    if (deduplicatedActions.length === 5) break; // Limit to maximum 5
  }

  return deduplicatedActions;
};

/**
 * Orchestrate the full recommendation generation flow:
 * 1. Fetch student profile & telemetry
 * 2. Invoke AI diagnosis (or fallback)
 * 3. Generate adaptive, prioritized action items
 * 4. Persist snapshot in ai_recommendations collection
 * 5. Return structured recommendation
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Document>} Saved AiRecommendation record
 */
export const generateStudentRecommendations = async (userId) => {
  const objectUserId = new mongoose.Types.ObjectId(userId);

  // 1. Fetch student twin profile
  let profile = await StudentTwinProfile.findOne({ userId: objectUserId });
  if (!profile) {
    profile = await recalculateStudentMastery(objectUserId);
  }

  // Populate topic names
  const topicIds = profile.topicMastery.map((tm) => tm.topicId);
  const topics = await Topic.find({ _id: { $in: topicIds } }).lean();
  const topicNameMap = new Map(topics.map((t) => [t._id.toString(), t.name]));

  const enrichedTopicMastery = profile.topicMastery.map((tm) => ({
    topicId: tm.topicId,
    topicName: topicNameMap.get(tm.topicId.toString()) || 'Unknown Topic',
    masteryScore: tm.masteryScore,
    accuracy: tm.accuracy,
    attemptsCount: tm.attemptsCount,
    averageTimeSeconds: tm.averageTimeSeconds,
    lastPracticed: tm.lastPracticed,
  }));

  const enrichedRepeatedMistakes = profile.repeatedMistakes.map((rm) => ({
    mistakeType: rm.mistakeType,
    topicId: rm.topicId,
    topicName: topicNameMap.get(rm.topicId.toString()) || 'Unknown Topic',
    count: rm.count,
    lastEncountered: rm.lastEncountered,
  }));

  // Fetch recent completed quizzes
  const recentQuizzes = await Quiz.find({ userId: objectUserId, status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(5)
    .lean();

  const recentQuizPayload = recentQuizzes.map((q) => ({
    score: q.score,
    accuracy: q.accuracy,
    totalTimeSeconds: q.totalTimeSeconds,
    completedAt: q.completedAt ? q.completedAt.toISOString() : null,
  }));

  // 2. Call AI diagnosis service with fallback
  const diagnosisPayload = {
    overallReadinessScore: profile.overallReadinessScore,
    topicMastery: enrichedTopicMastery.map((tm) => ({
      ...tm,
      topicId: tm.topicId.toString(),
      lastPracticed: tm.lastPracticed ? tm.lastPracticed.toISOString() : null,
    })),
    repeatedMistakes: enrichedRepeatedMistakes.map((rm) => ({
      ...rm,
      topicId: rm.topicId.toString(),
      lastEncountered: rm.lastEncountered ? rm.lastEncountered.toISOString() : null,
    })),
    recentQuizPerformance: recentQuizPayload,
  };

  const diagnosis = await fetchAiDiagnosisWithFallback(diagnosisPayload);

  // 3. Generate adaptive action items
  const actionItems = generateAdaptiveActionItems({
    topicMastery: enrichedTopicMastery,
    repeatedMistakes: enrichedRepeatedMistakes,
    diagnosis,
  });

  // 4. Validate and persist snapshot in ai_recommendations collection
  const recommendationRecord = await AiRecommendation.create({
    userId: objectUserId,
    diagnosisId: new mongoose.Types.ObjectId().toString(),
    diagnosisSummary: diagnosis.diagnosisSummary,
    weakTopics: diagnosis.weakTopics || [],
    strongTopics: diagnosis.strongTopics || [],
    actionItems,
  });

  return recommendationRecord;
};

export default {
  generateStudentRecommendations,
  generateAdaptiveActionItems,
  fetchAiDiagnosisWithFallback,
};
