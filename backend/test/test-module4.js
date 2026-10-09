process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_module4_mastery_analytics';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {
  calculateTopicMasteryScore,
  classifyMastery,
} from '../services/mastery.service.js';
import { MASTERY_THRESHOLDS } from '../config/mastery.config.js';

let mongod;
let server;
let baseUrl;

const runTests = async () => {
  console.log('==============================================');
  console.log('🚀 RUNNING MODULE 4 MASTERY & ANALYTICS TESTS');
  console.log('==============================================\n');

  try {
    // ----------------------------------------------------
    // SECTION A: UNIT TESTS FOR MASTERY CALCULATION
    // ----------------------------------------------------
    console.log('[1/14] Testing unit mastery calculation and classification...');

    // Scenario 1: Perfect performance across 5 questions (mix of medium & hard) with fast time
    const perfectAttempts = [
      { isCorrect: true, difficulty: 'medium', timeSpentSeconds: 20, mistakeType: 'none', attemptedAt: new Date(1) },
      { isCorrect: true, difficulty: 'medium', timeSpentSeconds: 25, mistakeType: 'none', attemptedAt: new Date(2) },
      { isCorrect: true, difficulty: 'hard', timeSpentSeconds: 30, mistakeType: 'none', attemptedAt: new Date(3) },
      { isCorrect: true, difficulty: 'hard', timeSpentSeconds: 22, mistakeType: 'none', attemptedAt: new Date(4) },
      { isCorrect: true, difficulty: 'hard', timeSpentSeconds: 28, mistakeType: 'none', attemptedAt: new Date(5) },
    ];
    const perfectScore = calculateTopicMasteryScore(perfectAttempts);
    const perfectTier = classifyMastery(perfectScore);
    console.log(`  -> Perfect performance score: ${perfectScore} (Tier: ${perfectTier})`);
    if (perfectScore < 85 || perfectTier !== 'mastered') {
      throw new Error(`Expected score >= 85 and tier 'mastered', got ${perfectScore} and ${perfectTier}`);
    }

    // Scenario 2: Struggling performance with repeated conceptual mistakes
    const strugglingAttempts = [
      { isCorrect: false, difficulty: 'easy', timeSpentSeconds: 95, mistakeType: 'conceptual', attemptedAt: new Date(1) },
      { isCorrect: false, difficulty: 'easy', timeSpentSeconds: 100, mistakeType: 'conceptual', attemptedAt: new Date(2) },
      { isCorrect: false, difficulty: 'medium', timeSpentSeconds: 110, mistakeType: 'conceptual', attemptedAt: new Date(3) },
      { isCorrect: true, difficulty: 'easy', timeSpentSeconds: 85, mistakeType: 'none', attemptedAt: new Date(4) },
    ];
    const strugglingScore = calculateTopicMasteryScore(strugglingAttempts);
    const strugglingTier = classifyMastery(strugglingScore);
    console.log(`  -> Struggling performance score: ${strugglingScore} (Tier: ${strugglingTier})`);
    if (strugglingScore > 39 || strugglingTier !== 'weak') {
      throw new Error(`Expected score <= 39 and tier 'weak', got ${strugglingScore} and ${strugglingTier}`);
    }

    // Scenario 3: Threshold verification
    if (classifyMastery(35) !== 'weak') throw new Error('Classification for 35 should be weak');
    if (classifyMastery(55) !== 'developing') throw new Error('Classification for 55 should be developing');
    if (classifyMastery(75) !== 'strong') throw new Error('Classification for 75 should be strong');
    if (classifyMastery(90) !== 'mastered') throw new Error('Classification for 90 should be mastered');
    console.log('✅ Unit tests for algorithm and threshold classification passed.\n');

    // ----------------------------------------------------
    // SECTION B: DATABASE & INTEGRATION TEST HARNESS
    // ----------------------------------------------------
    console.log('[2/14] Initializing MongoMemoryServer...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
    console.log(`✅ MongoDB in-memory active: ${uri}`);

    const { default: app } = await import('../server.js');
    const { default: Subject } = await import('../models/subject.model.js');
    const { default: Topic } = await import('../models/topic.model.js');
    const { default: Question } = await import('../models/question.model.js');
    const { default: StudentTwinProfile } = await import('../models/studentTwinProfile.model.js');

    const TEST_PORT = 5077;
    server = app.listen(TEST_PORT);
    baseUrl = `http://127.0.0.1:${TEST_PORT}/api/v1`;
    console.log(`✅ Test server running at ${baseUrl}\n`);

    const extractCookie = (res) => {
      const setCookie = res.headers.get('set-cookie');
      if (!setCookie) return null;
      const match = setCookie.match(/token=([^;]+)/);
      return match ? `token=${match[1]}` : null;
    };

    // ----------------------------------------------------
    // SECTION C: SEED CURRICULUM & REGISTER STUDENT
    // ----------------------------------------------------
    console.log('[3/14] Seeding 2 Topics with Questions...');
    const subject = await Subject.create({
      name: 'Computer Systems',
      description: 'Core Systems & Algorithms'
    });

    const topicA = await Topic.create({
      subjectId: subject._id,
      name: 'Binary Search Trees',
      description: 'BST operations'
    });

    const topicB = await Topic.create({
      subjectId: subject._id,
      name: 'Process Synchronization',
      description: 'Concurrency & Deadlocks'
    });

    // Topic A questions (3 questions)
    const topicAQuestions = await Question.insertMany([
      { topicId: topicA._id, questionText: 'BST Q1', options: ['A', 'B'], correctOptionIndex: 0, difficulty: 'easy' },
      { topicId: topicA._id, questionText: 'BST Q2', options: ['A', 'B'], correctOptionIndex: 0, difficulty: 'medium' },
      { topicId: topicA._id, questionText: 'BST Q3', options: ['A', 'B'], correctOptionIndex: 0, difficulty: 'hard' },
    ]);

    // Topic B questions (2 questions)
    const topicBQuestions = await Question.insertMany([
      { topicId: topicB._id, questionText: 'Sync Q1', options: ['A', 'B'], correctOptionIndex: 0, difficulty: 'easy' },
      { topicId: topicB._id, questionText: 'Sync Q2', options: ['A', 'B'], correctOptionIndex: 0, difficulty: 'medium' },
    ]);
    console.log('✅ Seeded: 1 Subject, 2 Topics, 5 Questions.');

    console.log('[4/14] Registering test student...');
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Jordan Lee', email: 'jordan@example.com', password: 'password123' })
    });
    const authCookie = extractCookie(regRes);
    console.log('✅ Student registered and auth cookie received.');

    // ----------------------------------------------------
    // SECTION D: UNAUTHENTICATED ACCESS TESTING
    // ----------------------------------------------------
    console.log('[5/14] Testing unauthenticated access to analytics endpoints (Expects 401)...');
    const unauth1 = await fetch(`${baseUrl}/analytics/overview`);
    const unauth2 = await fetch(`${baseUrl}/analytics/topics`);
    const unauth3 = await fetch(`${baseUrl}/analytics/mistakes`);
    const unauth4 = await fetch(`${baseUrl}/analytics/readiness`);
    if (unauth1.status !== 401 || unauth2.status !== 401 || unauth3.status !== 401 || unauth4.status !== 401) {
      throw new Error('All analytics endpoints must reject unauthenticated requests with 401');
    }
    console.log('✅ All 4 analytics endpoints safely protected with 401.');

    // ----------------------------------------------------
    // SECTION E: INITIAL OVERVIEW STATE
    // ----------------------------------------------------
    console.log('[6/14] Checking initial GET /analytics/overview state for new student...');
    const initOverviewRes = await fetch(`${baseUrl}/analytics/overview`, {
      headers: { Cookie: authCookie }
    });
    const initOverviewData = await initOverviewRes.json();
    if (initOverviewData.data.totalQuizzesCompleted !== 0 || initOverviewData.data.overallReadinessScore !== 0) {
      throw new Error(`Expected zero quizzes and readiness, got: ${JSON.stringify(initOverviewData.data)}`);
    }
    console.log('✅ Initial student overview correctly initialized with 0 quizzes and 0 readiness.');

    // ----------------------------------------------------
    // SECTION F: QUIZ 1 SUBMISSION → MASTERY UPDATE FLOW (TOPIC A)
    // ----------------------------------------------------
    console.log('[7/14] Starting and completing Quiz 1 on Topic A (BST - 3/3 Correct)...');
    const startQ1 = await fetch(`${baseUrl}/quizzes/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ topicId: topicA._id, numberOfQuestions: 3 })
    });
    const { data: { quizId: quiz1Id, questions: q1Questions } } = await startQ1.json();

    // Answer all 3 questions correctly with fast times (20s each)
    for (const q of q1Questions) {
      await fetch(`${baseUrl}/quizzes/${quiz1Id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ questionId: q._id, selectedOption: 0, timeSpentSeconds: 20 })
      });
    }

    // Submit Quiz 1
    const submitQ1 = await fetch(`${baseUrl}/quizzes/${quiz1Id}/submit`, {
      method: 'POST',
      headers: { Cookie: authCookie }
    });
    const submitQ1Data = await submitQ1.json();
    if (!submitQ1Data.success || submitQ1Data.data.score !== 3) {
      throw new Error('Quiz 1 submission failed');
    }

    // Verify StudentTwinProfile was created & updated in database
    const profileAfterQ1 = await StudentTwinProfile.findOne();
    if (!profileAfterQ1 || profileAfterQ1.topicMastery.length !== 1) {
      throw new Error('StudentTwinProfile was not automatically updated after Quiz 1 submission');
    }
    const topicAMastery = profileAfterQ1.topicMastery[0];
    console.log(`✅ Quiz 1 submission updated mastery for Topic A: score = ${topicAMastery.masteryScore}, readiness = ${profileAfterQ1.overallReadinessScore}`);
    if (topicAMastery.accuracy !== 100 || topicAMastery.attemptsCount !== 3) {
      throw new Error('Topic A mastery statistics incorrect');
    }

    // ----------------------------------------------------
    // SECTION G: QUIZ 2 SUBMISSION → MISTAKE DETECTION (TOPIC B)
    // ----------------------------------------------------
    console.log('[8/14] Starting and completing Quiz 2 on Topic B (Synchronization - 0/2 Correct, Conceptual Mistakes)...');
    const startQ2 = await fetch(`${baseUrl}/quizzes/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ topicId: topicB._id, numberOfQuestions: 2 })
    });
    const { data: { quizId: quiz2Id, questions: q2Questions } } = await startQ2.json();

    // Answer both questions incorrectly with mistakeType: 'conceptual'
    for (const q of q2Questions) {
      await fetch(`${baseUrl}/quizzes/${quiz2Id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({
          questionId: q._id,
          selectedOption: 1, // Wrong (correct is 0)
          mistakeType: 'conceptual',
          timeSpentSeconds: 65
        })
      });
    }

    // Submit Quiz 2
    const submitQ2 = await fetch(`${baseUrl}/quizzes/${quiz2Id}/submit`, {
      method: 'POST',
      headers: { Cookie: authCookie }
    });
    const submitQ2Data = await submitQ2.json();
    if (!submitQ2Data.success || submitQ2Data.data.score !== 0) {
      throw new Error('Quiz 2 submission failed');
    }

    const profileAfterQ2 = await StudentTwinProfile.findOne();
    if (profileAfterQ2.topicMastery.length !== 2) {
      throw new Error('Expected 2 topics in StudentTwinProfile');
    }
    console.log(`✅ Quiz 2 submission updated profile: 2 topics recorded, overallReadiness = ${profileAfterQ2.overallReadinessScore}`);

    // Verify repeated mistake detection
    const bstMistake = profileAfterQ2.repeatedMistakes.find(
      (m) => m.topicId.toString() === topicB._id.toString() && m.mistakeType === 'conceptual'
    );
    if (!bstMistake || bstMistake.count !== 2) {
      throw new Error(`Expected 2 repeated conceptual mistakes on Topic B, got: ${JSON.stringify(profileAfterQ2.repeatedMistakes)}`);
    }
    console.log(`✅ Repeated mistake correctly captured: ${bstMistake.count} conceptual mistakes on Topic B.`);

    // ----------------------------------------------------
    // SECTION H: TESTING ANALYTICS ENDPOINTS
    // ----------------------------------------------------
    console.log('[9/14] Testing GET /api/v1/analytics/overview...');
    const overviewRes = await fetch(`${baseUrl}/analytics/overview`, {
      headers: { Cookie: authCookie }
    });
    const overviewData = await overviewRes.json();
    if (!overviewData.success) throw new Error('Overview request failed');
    const o = overviewData.data;
    console.log('  -> Overview Summary:', {
      overallReadiness: o.overallReadinessScore,
      quizzesCompleted: o.totalQuizzesCompleted,
      questionsAttempted: o.totalQuestionsAttempted,
      accuracy: `${o.overallAccuracy}%`,
      topicTiers: o.topicCountsByTier
    });
    if (o.totalQuizzesCompleted !== 2 || o.totalQuestionsAttempted !== 5) {
      throw new Error('Overview counters mismatch');
    }
    if (o.recentPerformanceTrend.length !== 2) {
      throw new Error('Expected 2 quizzes in performance trend');
    }
    console.log('✅ GET /analytics/overview verified.');

    console.log('[10/14] Testing GET /api/v1/analytics/topics...');
    const topicsRes = await fetch(`${baseUrl}/analytics/topics`, {
      headers: { Cookie: authCookie }
    });
    const topicsData = await topicsRes.json();
    if (!topicsData.success || topicsData.count !== 2) {
      throw new Error('Topic analytics count mismatch');
    }
    const grouped = topicsData.data.grouped;
    console.log('  -> Grouped topics breakdown:');
    console.log(`     Weak topics: ${grouped.weak.length}`);
    console.log(`     Developing topics: ${grouped.developing.length}`);
    console.log(`     Strong/Mastered topics: ${grouped.strong.length + grouped.mastered.length}`);

    // Topic B should be in 'weak'
    const weakFound = grouped.weak.find((t) => t.topicId.toString() === topicB._id.toString());
    if (!weakFound) {
      throw new Error('Topic B was not classified under "weak"');
    }
    // Topic A should be developing/strong/mastered (score > 39)
    const strongOrDev = [...grouped.developing, ...grouped.strong, ...grouped.mastered].find(
      (t) => t.topicId.toString() === topicA._id.toString()
    );
    if (!strongOrDev) {
      throw new Error('Topic A was not classified above weak');
    }
    console.log('✅ GET /analytics/topics verified with proper classification.');

    console.log('[11/14] Testing GET /api/v1/analytics/mistakes...');
    const mistakesRes = await fetch(`${baseUrl}/analytics/mistakes`, {
      headers: { Cookie: authCookie }
    });
    const mistakesData = await mistakesRes.json();
    if (!mistakesData.success) throw new Error('Mistakes analytics failed');
    const m = mistakesData.data;
    console.log('  -> Mistake Summary:', {
      totalMistakes: m.totalMistakesRecorded,
      distribution: m.mistakeTypeDistribution,
      patternCount: m.repeatedMistakePatterns.length
    });
    if (m.totalMistakesRecorded !== 2 || m.mistakeTypeDistribution.conceptual !== 2) {
      throw new Error('Mistake distribution calculation incorrect');
    }
    if (m.repeatedMistakePatterns[0].topicName !== 'Process Synchronization') {
      throw new Error('Mistake pattern did not populate topic name properly');
    }
    console.log('✅ GET /analytics/mistakes verified.');

    console.log('[12/14] Testing GET /api/v1/analytics/readiness...');
    const readinessRes = await fetch(`${baseUrl}/analytics/readiness`, {
      headers: { Cookie: authCookie }
    });
    const readinessData = await readinessRes.json();
    if (!readinessData.success) throw new Error('Readiness analytics failed');
    const r = readinessData.data;
    console.log('  -> Readiness Summary:', {
      readinessScore: r.readinessScore,
      tier: r.readinessTier,
      coverage: `${r.curriculumCoverage.coveragePercentage}%`
    });
    if (r.curriculumCoverage.topicsPracticed !== 2 || r.curriculumCoverage.coveragePercentage !== 100) {
      throw new Error('Curriculum coverage percentage incorrect');
    }
    console.log('✅ GET /analytics/readiness verified.');

    console.log('\n==============================================');
    console.log('🎉 ALL MODULE 4 MASTERY & ANALYTICS TESTS PASSED! 🎉');
    console.log('==============================================');
  } catch (err) {
    console.error('\n❌ MODULE 4 TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(process.exitCode || 0);
  }
};

runTests();
