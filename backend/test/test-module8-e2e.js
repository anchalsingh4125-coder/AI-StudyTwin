process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_module8_e2e_verification_98765';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongod;
let server;
let baseUrl;
let aiProcess;

const AI_TEST_PORT = 8092;
const FASTAPI_URL = `http://127.0.0.1:${AI_TEST_PORT}`;
process.env.AI_SERVICE_URL = FASTAPI_URL;

const startFastAPIService = () => {
  return new Promise((resolve, reject) => {
    console.log(`[Setup] Spawning Python FastAPI AI microservice on port ${AI_TEST_PORT}...`);
    const aiServiceDir = path.resolve(__dirname, '../../ai-service');
    const pythonExe = path.join(aiServiceDir, 'venv', 'Scripts', 'python.exe');

    aiProcess = spawn(
      pythonExe,
      ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(AI_TEST_PORT)],
      {
        cwd: aiServiceDir,
        env: { ...process.env, PORT: String(AI_TEST_PORT) },
        stdio: 'pipe',
      }
    );

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        console.warn('FastAPI startup wait timeout reached; continuing (fallback engine will handle requests).');
        resolve(false);
      }
    }, 8000);

    const checkHealth = async () => {
      try {
        const res = await fetch(`${FASTAPI_URL}/health`);
        if (res.ok) {
          started = true;
          clearTimeout(timeout);
          console.log(`✅ FastAPI microservice active at ${FASTAPI_URL}`);
          resolve(true);
          return;
        }
      } catch (e) {
        // Retry until timeout
      }
      if (!started) setTimeout(checkHealth, 400);
    };

    setTimeout(checkHealth, 1000);

    aiProcess.on('error', (err) => {
      clearTimeout(timeout);
      console.warn('Could not launch FastAPI process (using fallback engine):', err.message);
      resolve(false);
    });
  });
};

const runE2ETests = async () => {
  console.log('================================================================');
  console.log('🚀 RUNNING MODULE 8: FULL-STACK END-TO-END VERIFICATION SUITE');
  console.log('================================================================\n');

  try {
    // 1. Start AI microservice
    console.log('[1/14] Setting up Python FastAPI AI microservice...');
    await startFastAPIService();

    // 2. Initialize in-memory Mongo
    console.log('[2/14] Initializing MongoMemoryServer...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
    console.log(`✅ MongoDB in-memory active: ${uri}`);

    // Dynamic model & server imports
    const { default: app } = await import('../server.js');
    const { default: Subject } = await import('../models/subject.model.js');
    const { default: Topic } = await import('../models/topic.model.js');
    const { default: Question } = await import('../models/question.model.js');
    const { default: User } = await import('../models/user.model.js');
    const { default: Quiz } = await import('../models/quiz.model.js');

    const TEST_PORT = 5044;
    server = app.listen(TEST_PORT);
    baseUrl = `http://127.0.0.1:${TEST_PORT}/api/v1`;
    console.log(`✅ Backend Gateway listening at ${baseUrl}\n`);

    const extractCookie = (res) => {
      const setCookie = res.headers.get('set-cookie');
      if (!setCookie) return null;
      const match = setCookie.match(/token=([^;]+)/);
      return match ? `token=${match[1]}` : null;
    };

    // 3. Seed curriculum data
    console.log('[3/14] Seeding core CS curriculum hierarchy...');
    const osSubject = await Subject.create({
      name: 'Operating Systems',
      description: 'Concurrency, memory hierarchies, and scheduling policies',
    });

    const threadTopic = await Topic.create({
      subjectId: osSubject._id,
      name: 'Concurrency & Deadlocks',
      description: 'Critical sections, mutual exclusion, and Coffman conditions',
    });

    const memTopic = await Topic.create({
      subjectId: osSubject._id,
      name: 'Virtual Memory',
      description: 'Paging, TLB, page replacement algorithms',
    });

    await Question.insertMany([
      {
        topicId: threadTopic._id,
        questionText: 'Which condition is NOT one of Coffman conditions for deadlock?',
        options: ['Mutual Exclusion', 'Hold and Wait', 'Preemption Allowed', 'Circular Wait'],
        correctOptionIndex: 2,
        explanation: 'Coffman requires NO preemption; preemption prevents deadlock.',
        difficulty: 'medium',
      },
      {
        topicId: threadTopic._id,
        questionText: 'What is a race condition?',
        options: [
          'Multiple threads access shared state concurrently with output depending on execution order',
          'A hardware memory bus error',
          'A deadlock involving two processors',
          'A condition where CPU clock speed accelerates',
        ],
        correctOptionIndex: 0,
        explanation: 'Race condition occurs when shared data integrity depends on nondeterministic thread scheduling.',
        difficulty: 'easy',
      },
      {
        topicId: memTopic._id,
        questionText: 'What is the purpose of the Translation Lookaside Buffer (TLB)?',
        options: [
          'Store virtual page frames',
          'Cache virtual-to-physical address translations',
          'Handle page fault interrupts',
          'Allocate kernel stack space',
        ],
        correctOptionIndex: 1,
        explanation: 'TLB is a fast hardware associative cache for page table entries.',
        difficulty: 'easy',
      },
    ]);
    console.log('✅ Seeded 1 Subject, 2 Topics, 3 Questions.');

    // 4. Test Zod Validation: Rejection of malformed requests
    console.log('[4/14] Testing Zod Input Validation & Payload Hardening...');

    // A. Invalid registration email
    const badEmailRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan',
        email: 'invalid-email-format',
        password: 'password123',
      }),
    });
    if (badEmailRes.status !== 400) {
      throw new Error(`Expected 400 for bad email format, got ${badEmailRes.status}`);
    }
    const badEmailData = await badEmailRes.json();
    console.log('✅ Invalid email rejected with 400:', badEmailData.message);

    // B. Short password rejection
    const shortPassRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan',
        email: 'jordan@college.edu',
        password: '123',
      }),
    });
    if (shortPassRes.status !== 400) {
      throw new Error(`Expected 400 for short password, got ${shortPassRes.status}`);
    }
    console.log('✅ Short password rejected with 400.');

    // C. Malformed ObjectId in params
    const badParamRes = await fetch(`${baseUrl}/quizzes/not-a-valid-object-id/result`);
    if (badParamRes.status !== 400 && badParamRes.status !== 401) {
      throw new Error(`Expected 400 or 401 for malformed route param, got ${badParamRes.status}`);
    }
    console.log('✅ Malformed ObjectId route parameters guarded.');

    // 5. Register Student User & Verify Session Cookie
    console.log('[5/14] Executing User Onboarding & Registration flow...');
    const registerRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Samantha Reed',
        email: 'samantha.reed@mit.edu',
        password: 'secureCandidatePass2026!',
        targetSubjects: ['Operating Systems'],
      }),
    });
    if (registerRes.status !== 201) {
      throw new Error(`Registration failed with status ${registerRes.status}`);
    }
    const authCookie = extractCookie(registerRes);
    if (!authCookie) {
      throw new Error('No authentication cookie issued upon registration');
    }
    const regData = await registerRes.json();
    if (regData.data.user.password) {
      throw new Error('SECURITY VIOLATION: Password hash leaked in response');
    }
    console.log('✅ Student registered successfully with secure httpOnly cookie session.');

    // 6. Verify Session Identity
    console.log('[6/14] Testing GET /auth/me session resolution...');
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: authCookie },
    });
    const meData = await meRes.json();
    if (meRes.status !== 200 || meData.data.user.email !== 'samantha.reed@mit.edu') {
      throw new Error(`GET /auth/me verification failed: ${JSON.stringify(meData)}`);
    }
    console.log('✅ Authenticated student resolved:', meData.data.user.name);

    // 7. Verify Initial Analytics / Twin State
    console.log('[7/14] Testing baseline Digital Twin Profile initialization...');
    const initOverviewRes = await fetch(`${baseUrl}/analytics/overview`, {
      headers: { Cookie: authCookie },
    });
    const initOverview = await initOverviewRes.json();
    if (initOverview.data.overallReadinessScore !== 0 || initOverview.data.totalQuizzesCompleted !== 0) {
      throw new Error('Initial profile should reflect zero completed sessions.');
    }
    console.log('✅ Clean baseline profile verified.');

    // 8. Start Diagnostic Quiz Session
    console.log('[8/14] Starting targeted diagnostic quiz on Concurrency & Deadlocks...');
    const quizStartRes = await fetch(`${baseUrl}/quizzes/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        topicId: threadTopic._id.toString(),
        numberOfQuestions: 2,
      }),
    });
    const quizStartData = await quizStartRes.json();
    if (quizStartRes.status !== 201 || !quizStartData.data.quizId) {
      throw new Error(`Quiz launch failed: ${JSON.stringify(quizStartData)}`);
    }
    const quizId = quizStartData.data.quizId;
    const questions = quizStartData.data.questions;
    if (questions.length !== 2) {
      throw new Error(`Expected 2 questions, received ${questions.length}`);
    }
    // Verify question sanitization
    if (questions[0].correctOptionIndex !== undefined || questions[0].explanation !== undefined) {
      throw new Error('SECURITY VIOLATION: Question answers/explanations exposed in active quiz runner!');
    }
    console.log(`✅ Diagnostic Quiz started (${quizId}) with sanitized question set.`);

    // 9. Submit Granular Telemetry Per Question
    console.log('[9/14] Streaming answer telemetry (1 Correct, 1 Conceptual Misconception)...');
    const dbQuestions = await Question.find({ _id: { $in: questions.map((q) => q._id) } });
    const dbQMap = new Map(dbQuestions.map((q) => [q._id.toString(), q]));

    // Question 1: Answer correctly
    const q1 = questions[0];
    const correctOpt1 = dbQMap.get(q1._id.toString()).correctOptionIndex;
    const q1Res = await fetch(`${baseUrl}/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        questionId: q1._id,
        selectedOption: correctOpt1,
        timeSpentSeconds: 14,
      }),
    });
    if (q1Res.status !== 200) throw new Error(`Answer Q1 failed: ${q1Res.status}`);

    // Question 2: Answer incorrectly with conceptual mistake tag
    const q2 = questions[1];
    const correctOpt2 = dbQMap.get(q2._id.toString()).correctOptionIndex;
    const wrongOpt2 = (correctOpt2 + 1) % 4;
    const q2Res = await fetch(`${baseUrl}/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        questionId: q2._id,
        selectedOption: wrongOpt2,
        timeSpentSeconds: 28,
        mistakeType: 'conceptual',
      }),
    });
    if (q2Res.status !== 200) throw new Error(`Answer Q2 failed: ${q2Res.status}`);
    console.log('✅ Real-time telemetry ingestion accepted per-question answers and mistake tags.');

    // 10. Complete & Submit Quiz
    console.log('[10/14] Finalizing quiz submission & triggering mastery calculation pipeline...');
    const submitRes = await fetch(`${baseUrl}/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    const submitData = await submitRes.json();
    if (submitRes.status !== 200 || !submitData.success) {
      throw new Error(`Submit failed: ${JSON.stringify(submitData)}`);
    }
    if (submitData.data.score !== 1 || submitData.data.accuracy !== 50) {
      throw new Error(`Telemetry calculation mismatch: score=${submitData.data.score}, accuracy=${submitData.data.accuracy}`);
    }
    console.log('✅ Quiz successfully evaluated. Score: 1/2 (50% Accuracy). Total time:', submitData.data.totalTimeSeconds, 's');

    // Duplicate submission guard check
    const dupSubmitRes = await fetch(`${baseUrl}/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    if (dupSubmitRes.status !== 400) {
      throw new Error(`Duplicate submission should be rejected with 400, got ${dupSubmitRes.status}`);
    }
    console.log('✅ Duplicate submission attempt properly blocked.');

    // 11. Retrieve Detailed Quiz Results with Explanations
    console.log('[11/14] Testing GET /quizzes/:quizId/result for post-quiz review...');
    const resultRes = await fetch(`${baseUrl}/quizzes/${quizId}/result`, {
      headers: { Cookie: authCookie },
    });
    const resultData = await resultRes.json();
    if (resultRes.status !== 200 || resultData.data.attempts.length !== 2) {
      throw new Error(`Result fetch failed: ${JSON.stringify(resultData)}`);
    }
    if (!resultData.data.attempts[0].explanation) {
      throw new Error('Post-quiz review should include question explanations.');
    }
    console.log('✅ Post-quiz diagnostic review retrieved with correct explanations.');

    // 12. Verify Cognitive Analytics & Mistake Tracking
    console.log('[12/14] Inspecting updated cognitive analytics & mistake taxonomy...');
    const [overviewRes, topicsRes, mistakesRes] = await Promise.all([
      fetch(`${baseUrl}/analytics/overview`, { headers: { Cookie: authCookie } }),
      fetch(`${baseUrl}/analytics/topics`, { headers: { Cookie: authCookie } }),
      fetch(`${baseUrl}/analytics/mistakes`, { headers: { Cookie: authCookie } }),
    ]);

    const overviewJson = await overviewRes.json();
    const topicsJson = await topicsRes.json();
    const mistakesJson = await mistakesRes.json();

    if (overviewJson.data.totalQuizzesCompleted !== 1 || overviewJson.data.totalQuestionsAttempted !== 2) {
      throw new Error('Analytics overview counters did not reflect submitted quiz.');
    }
    if (mistakesJson.data.totalMistakesRecorded !== 1 || mistakesJson.data.mistakeTypeDistribution.conceptual !== 1) {
      throw new Error('Conceptual mistake was not tracked in mistake analytics.');
    }
    console.log('✅ Analytics engine accurately updated: Readiness =', overviewJson.data.overallReadinessScore);
    console.log('✅ Mistake taxonomy recorded 1 conceptual error on topic:', mistakesJson.data.repeatedMistakePatterns[0]?.topicName);

    // 13. Test AI Diagnosis & Adaptive Recommendations
    console.log('[13/14] Triggering AI Diagnosis & Adaptive Recommendation generation...');
    const diagRes = await fetch(`${baseUrl}/ai/diagnose`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    const diagData = await diagRes.json();
    if (diagRes.status !== 200 && diagRes.status !== 502) {
      throw new Error(`AI Diagnose returned unexpected status: ${diagRes.status}`);
    }
    if (diagRes.status === 200) {
      console.log('✅ AI Diagnosis succeeded. Summary:', diagData.data.diagnosis.diagnosisSummary);
    }

    const recRes = await fetch(`${baseUrl}/ai/recommendations`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    const recData = await recRes.json();
    if (recRes.status !== 201 || !recData.data.recommendations) {
      throw new Error(`Recommendation generation failed: ${JSON.stringify(recData)}`);
    }
    const actionItems = recData.data.recommendations.actionItems;
    if (!Array.isArray(actionItems) || actionItems.length === 0) {
      throw new Error('Expected at least one adaptive action item.');
    }
    console.log(`✅ Adaptive Recommendation plan created with ${actionItems.length} action item(s):`);
    actionItems.forEach((item) => {
      console.log(`   - [${item.priority.toUpperCase()}] ${item.topicName}: ${item.recommendedAction} (~${item.estimatedMinutes}m)`);
    });

    const histRes = await fetch(`${baseUrl}/ai/recommendations/history`, {
      headers: { Cookie: authCookie },
    });
    const histData = await histRes.json();
    if (histRes.status !== 200 || histData.data.history.length === 0) {
      throw new Error('Recommendation history snapshot was not preserved.');
    }
    console.log('✅ Recommendation snapshot archive verified.');

    // 14. Student Logout & Session Termination
    console.log('[14/14] Testing student logout and session cookie invalidation...');
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    if (logoutRes.status !== 200) throw new Error(`Logout failed: ${logoutRes.status}`);
    console.log('✅ Session successfully terminated.');

    console.log('\n================================================================');
    console.log('🎉 ALL 14 MODULE 8 END-TO-END VERIFICATION CHECKS PASSED! 🎉');
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ Module 8 Test Suite Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
    if (aiProcess) {
      try {
        process.kill(aiProcess.pid);
      } catch (e) {
        // Ignored
      }
    }
  }
};

runE2ETests();
