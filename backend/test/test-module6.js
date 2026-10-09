process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_module6_recommendations';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { generateAdaptiveActionItems } from '../services/recommendation.service.js';

let mongod;
let nodeServer;
let baseUrl;

const NODE_TEST_PORT = 5055;

const runTests = async () => {
  console.log('===========================================================');
  console.log('🚀 RUNNING MODULE 6 ADAPTIVE RECOMMENDATIONS ENGINE TESTS');
  console.log('===========================================================\n');

  try {
    // ----------------------------------------------------
    // SECTION A: UNIT TESTS FOR ADAPTIVE RULES & LIMITS
    // ----------------------------------------------------
    console.log('[1/12] Testing adaptive recommendation logic & heuristics...');

    const topic1Id = new mongoose.Types.ObjectId();
    const topic2Id = new mongoose.Types.ObjectId();
    const topic3Id = new mongoose.Types.ObjectId();
    const topic4Id = new mongoose.Types.ObjectId();
    const topic5Id = new mongoose.Types.ObjectId();
    const topic6Id = new mongoose.Types.ObjectId();

    const mockTopics = [
      // 1. Weak topic baseline (mastery 25)
      { topicId: topic1Id, topicName: 'Dynamic Programming', masteryScore: 25, accuracy: 30, averageTimeSeconds: 40, lastPracticed: new Date() },
      // 2. Low accuracy + High time (Conceptual confusion)
      { topicId: topic2Id, topicName: 'Graph Flow', masteryScore: 35, accuracy: 25, averageTimeSeconds: 95, lastPracticed: new Date() },
      // 3. High accuracy + High time (Speed bottleneck)
      { topicId: topic3Id, topicName: 'Hashing', masteryScore: 78, accuracy: 85, averageTimeSeconds: 75, lastPracticed: new Date() },
      // 4. Stale topic (not practiced in 12 days, mastery 85)
      { topicId: topic4Id, topicName: 'Binary Trees', masteryScore: 88, accuracy: 90, averageTimeSeconds: 30, lastPracticed: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
      // 5. Developing topic (mastery 55)
      { topicId: topic5Id, topicName: 'Sorting Algorithms', masteryScore: 55, accuracy: 60, averageTimeSeconds: 45, lastPracticed: new Date() },
      // 6. Extra high-mastery topic
      { topicId: topic6Id, topicName: 'Bit Manipulation', masteryScore: 92, accuracy: 95, averageTimeSeconds: 20, lastPracticed: new Date() },
    ];

    // Repeated mistakes on Dynamic Programming
    const mockMistakes = [
      { mistakeType: 'conceptual', topicId: topic1Id, topicName: 'Dynamic Programming', count: 3 },
    ];

    const actions = generateAdaptiveActionItems({
      topicMastery: mockTopics,
      repeatedMistakes: mockMistakes,
      diagnosis: { weakTopics: ['Dynamic Programming', 'Graph Flow'], strongTopics: ['Binary Trees', 'Bit Manipulation'] },
    });

    console.log(`  -> Generated ${actions.length} action items from 6 candidate topics.`);

    // Check maximum 5 recommendations constraint
    if (actions.length > 5) {
      throw new Error(`Expected at most 5 actions, but received ${actions.length}`);
    }
    console.log('✅ Capped at maximum 5 recommendations.');

    // Check repeated mistake prioritization
    const dpAction = actions.find((a) => a.topicId.toString() === topic1Id.toString());
    if (!dpAction || dpAction.priority !== 'high' || !dpAction.recommendedAction.includes('Targeted Misconception Drill')) {
      throw new Error(`Repeated mistake escalation failed for Dynamic Programming: ${JSON.stringify(dpAction)}`);
    }
    console.log('✅ Repeated mistake escalated to High priority with Targeted Misconception Drill.');

    // Check low accuracy + high time (conceptual deep dive)
    const graphAction = actions.find((a) => a.topicId.toString() === topic2Id.toString());
    if (!graphAction || !graphAction.recommendedAction.includes('Conceptual Deep Dive')) {
      throw new Error(`Low accuracy + high time recommendation failed: ${JSON.stringify(graphAction)}`);
    }
    console.log('✅ Low accuracy + high time correctly generated Conceptual Deep Dive.');

    // Check high accuracy + high time (speed & pacing sprint)
    const hashAction = actions.find((a) => a.topicId.toString() === topic3Id.toString());
    if (!hashAction || !hashAction.recommendedAction.includes('Speed & Pacing Sprint')) {
      throw new Error(`High accuracy + high time speed sprint failed: ${JSON.stringify(hashAction)}`);
    }
    console.log('✅ High accuracy + high time correctly generated Speed & Pacing Sprint.');

    // Check stale topic spaced repetition refresher
    const staleAction = actions.find((a) => a.topicId.toString() === topic4Id.toString());
    if (!staleAction || !staleAction.recommendedAction.includes('Spaced Repetition Refresher')) {
      throw new Error(`Stale topic spaced repetition failed: ${JSON.stringify(staleAction)}`);
    }
    console.log('✅ Stale topic (>7 days) correctly generated Spaced Repetition Refresher.');

    // Check deduplication (each topicId appears exactly once)
    const topicIdSet = new Set(actions.map((a) => a.topicId.toString()));
    if (topicIdSet.size !== actions.length) {
      throw new Error('Duplicate action items found for the same topic ID!');
    }
    console.log('✅ Duplicate recommendations per topic strictly prevented.\n');

    // ----------------------------------------------------
    // SECTION B: DATABASE & INTEGRATION TEST HARNESS
    // ----------------------------------------------------
    console.log('[2/12] Initializing MongoDB in-memory & Node.js backend...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    await mongoose.connect(uri);

    const { default: app } = await import('../server.js');
    const { default: Subject } = await import('../models/subject.model.js');
    const { default: Topic } = await import('../models/topic.model.js');
    const { default: Question } = await import('../models/question.model.js');
    const { default: AiRecommendation } = await import('../models/aiRecommendation.model.js');

    nodeServer = app.listen(NODE_TEST_PORT);
    baseUrl = `http://127.0.0.1:${NODE_TEST_PORT}/api/v1`;
    console.log(`✅ Node backend listening at ${baseUrl}\n`);

    const extractCookie = (res) => {
      const setCookie = res.headers.get('set-cookie');
      if (!setCookie) return null;
      const match = setCookie.match(/token=([^;]+)/);
      return match ? `token=${match[1]}` : null;
    };

    // ----------------------------------------------------
    // SECTION C: UNAUTHENTICATED ACCESS TESTING
    // ----------------------------------------------------
    console.log('[3/12] Testing unauthenticated access to recommendation endpoints (Expects 401)...');
    const unauthPost = await fetch(`${baseUrl}/ai/recommendations`, { method: 'POST' });
    const unauthGet = await fetch(`${baseUrl}/ai/recommendations`);
    const unauthHistory = await fetch(`${baseUrl}/ai/recommendations/history`);
    if (unauthPost.status !== 401 || unauthGet.status !== 401 || unauthHistory.status !== 401) {
      throw new Error('All recommendation endpoints must block unauthenticated requests with 401');
    }
    console.log('✅ All recommendation endpoints securely protected with 401.');

    // ----------------------------------------------------
    // SECTION D: SEED DATA & COMPLETE QUIZ
    // ----------------------------------------------------
    console.log('[4/12] Seeding curriculum and registering student...');
    const subject = await Subject.create({ name: 'Algorithms', description: 'Advanced Algorithms' });
    const bstTopic = await Topic.create({ subjectId: subject._id, name: 'Binary Search Trees' });
    const avlTopic = await Topic.create({ subjectId: subject._id, name: 'AVL Trees' });

    const q1 = await Question.create({
      topicId: bstTopic._id,
      questionText: 'BST Search?',
      options: ['O(log n)', 'O(n)'],
      correctOptionIndex: 0,
      difficulty: 'easy',
    });
    const q2 = await Question.create({
      topicId: avlTopic._id,
      questionText: 'AVL Rotation?',
      options: ['LL, RR, LR, RL', 'None'],
      correctOptionIndex: 0,
      difficulty: 'hard',
    });

    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Sam Altman', email: 'sam@example.com', password: 'password123' }),
    });
    const authCookie = extractCookie(regRes);

    // Complete quiz: Q1 correct (BST), Q2 incorrect with conceptual mistake (AVL)
    const startRes = await fetch(`${baseUrl}/quizzes/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ subjectId: subject._id, numberOfQuestions: 2 }),
    });
    const { data: { quizId } } = await startRes.json();

    await fetch(`${baseUrl}/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ questionId: q1._id, selectedOption: 0, timeSpentSeconds: 18 }),
    });
    await fetch(`${baseUrl}/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ questionId: q2._id, selectedOption: 1, mistakeType: 'conceptual', timeSpentSeconds: 85 }),
    });
    await fetch(`${baseUrl}/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    console.log('✅ Student quiz telemetry established.');

    // ----------------------------------------------------
    // SECTION E: GENERATE ADAPTIVE RECOMMENDATIONS (POST)
    // ----------------------------------------------------
    console.log('[5/12] Testing POST /api/v1/ai/recommendations (with AI fallback handling)...');
    // Set offline AI service URL to verify safe fallback behavior without crashing
    process.env.AI_SERVICE_URL = 'http://127.0.0.1:59999';

    const createRecRes = await fetch(`${baseUrl}/ai/recommendations`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });

    if (createRecRes.status !== 201) {
      const err = await createRecRes.text();
      throw new Error(`Failed to generate recommendations (${createRecRes.status}): ${err}`);
    }
    const createRecData = await createRecRes.json();
    const rec1 = createRecData.data.recommendations;

    console.log('  -> Generated Recommendation Snapshot:');
    console.log(`     Diagnosis Summary: ${rec1.diagnosisSummary}`);
    console.log(`     Action Items Count: ${rec1.actionItems.length}`);
    for (const item of rec1.actionItems) {
      console.log(`     - [${item.priority.toUpperCase()}] ${item.topicName}: ${item.recommendedAction}`);
    }

    if (!rec1.diagnosisSummary || !Array.isArray(rec1.actionItems) || rec1.actionItems.length === 0) {
      throw new Error('Recommendation response format invalid');
    }
    console.log('✅ POST /ai/recommendations succeeded with valid adaptive action items.');

    // ----------------------------------------------------
    // SECTION F: PERSISTENCE VERIFICATION
    // ----------------------------------------------------
    console.log('[6/12] Verifying recommendation persistence in MongoDB (ai_recommendations)...');
    const storedRec = await AiRecommendation.findById(rec1._id);
    if (!storedRec) {
      throw new Error('Recommendation document not found in ai_recommendations collection');
    }
    if (storedRec.actionItems.length !== rec1.actionItems.length) {
      throw new Error('Persisted action items count mismatch');
    }
    console.log('✅ Verified persistence in MongoDB (ai_recommendations collection).');

    // ----------------------------------------------------
    // SECTION G: RETRIEVE LATEST RECOMMENDATION (GET)
    // ----------------------------------------------------
    console.log('[7/12] Testing GET /api/v1/ai/recommendations (latest snapshot)...');
    const getLatestRes = await fetch(`${baseUrl}/ai/recommendations`, {
      headers: { Cookie: authCookie },
    });
    if (getLatestRes.status !== 200) throw new Error('GET /ai/recommendations failed');
    const latestData = await getLatestRes.json();
    if (latestData.data.recommendations._id !== rec1._id) {
      throw new Error('Latest recommendation does not match created snapshot ID');
    }
    console.log('✅ GET /ai/recommendations successfully returned the latest snapshot.');

    // ----------------------------------------------------
    // SECTION H: RETRIEVE RECOMMENDATION HISTORY (GET)
    // ----------------------------------------------------
    console.log('[8/12] Generating a second recommendation snapshot to verify history...');
    await fetch(`${baseUrl}/ai/recommendations`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });

    console.log('[9/12] Testing GET /api/v1/ai/recommendations/history...');
    const historyRes = await fetch(`${baseUrl}/ai/recommendations/history`, {
      headers: { Cookie: authCookie },
    });
    if (historyRes.status !== 200) throw new Error('GET /ai/recommendations/history failed');
    const historyData = await historyRes.json();
    if (historyData.count !== 2 || historyData.data.history.length !== 2) {
      throw new Error(`Expected 2 historical snapshots, got ${historyData.count}`);
    }
    console.log(`✅ GET /ai/recommendations/history correctly returned ${historyData.count} snapshots.`);

    // ----------------------------------------------------
    // SECTION I: VERIFY WEAK TOPIC RECOMMENDATION ATTRIBUTES
    // ----------------------------------------------------
    console.log('[10/12] Verifying weak topic action item attributes...');
    const weakAction = rec1.actionItems.find((a) => a.topicName === 'AVL Trees');
    if (!weakAction || weakAction.priority !== 'high') {
      throw new Error('AVL Trees should be flagged with high priority');
    }
    if (weakAction.estimatedMinutes < 5 || weakAction.practiceQuestionCount < 1) {
      throw new Error('Action item estimatedMinutes or practiceQuestionCount out of bounds');
    }
    console.log(`✅ Weak topic "AVL Trees" flagged with high priority, ${weakAction.estimatedMinutes}m estimate, and ${weakAction.practiceQuestionCount} questions.`);

    console.log('[11/12] Verifying schema compliance on all response fields...');
    for (const item of rec1.actionItems) {
      if (!['high', 'medium', 'low'].includes(item.priority)) {
        throw new Error(`Invalid priority: ${item.priority}`);
      }
      if (!item.topicId || !item.topicName || !item.recommendedAction || !item.rationale) {
        throw new Error(`Missing required fields in action item: ${JSON.stringify(item)}`);
      }
    }
    console.log('✅ All action item schema fields strictly validated.');

    console.log('[12/12] All tests in Module 6 verified successfully!');

    console.log('\n===========================================================');
    console.log('🎉 ALL MODULE 6 ADAPTIVE RECOMMENDATIONS TESTS PASSED! 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('\n❌ MODULE 6 TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (nodeServer) nodeServer.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(process.exitCode || 0);
  }
};

runTests();
