process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_module5_ai_diagnosis';

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongod;
let nodeServer;
let pythonProc;
let baseUrl;

const FASTAPI_TEST_PORT = 8089;
const NODE_TEST_PORT = 5066;

const runTests = async () => {
  console.log('========================================================');
  console.log('🚀 RUNNING MODULE 5 AI DIAGNOSIS INTEGRATION TESTS');
  console.log('========================================================\n');

  try {
    // ----------------------------------------------------
    // 1. Start Python FastAPI microservice in child process
    // ----------------------------------------------------
    console.log('[1/10] Starting Python FastAPI AI Microservice on port ' + FASTAPI_TEST_PORT + '...');
    const aiServiceDir = path.resolve(__dirname, '../../ai-service');
    const pythonExe = path.join(aiServiceDir, 'venv', 'Scripts', 'python.exe');

    pythonProc = spawn(
      pythonExe,
      ['-m', 'uvicorn', 'main:app', '--port', String(FASTAPI_TEST_PORT), '--host', '127.0.0.1'],
      { cwd: aiServiceDir, stdio: 'pipe' }
    );

    // Wait for FastAPI to become ready
    const fastApiUrl = `http://127.0.0.1:${FASTAPI_TEST_PORT}`;
    process.env.AI_SERVICE_URL = fastApiUrl;

    let ready = false;
    for (let i = 0; i < 20; i++) {
      try {
        const hRes = await fetch(`${fastApiUrl}/health`);
        if (hRes.ok) {
          ready = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (!ready) {
      throw new Error('Failed to connect to FastAPI microservice on port ' + FASTAPI_TEST_PORT);
    }
    console.log(`✅ FastAPI AI Service is online and healthy at ${fastApiUrl}\n`);

    // ----------------------------------------------------
    // 2. Direct FastAPI health test
    // ----------------------------------------------------
    console.log('[2/10] Verifying direct GET /health on AI microservice...');
    const fastApiHealth = await (await fetch(`${fastApiUrl}/health`)).json();
    if (fastApiHealth.status !== 'ok') {
      throw new Error(`Unexpected FastAPI health response: ${JSON.stringify(fastApiHealth)}`);
    }
    console.log('✅ FastAPI health check returned: status "ok"');

    // ----------------------------------------------------
    // 3. Direct FastAPI /diagnose test (Deterministic fallback engine)
    // ----------------------------------------------------
    console.log('[3/10] Verifying direct POST /diagnose with Pydantic validation...');
    const directDiagRes = await fetch(`${fastApiUrl}/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        overallReadinessScore: 45.0,
        topicMastery: [
          {
            topicId: 'topic-1',
            topicName: 'Binary Trees',
            masteryScore: 82.0,
            accuracy: 85.0,
            attemptsCount: 6,
            averageTimeSeconds: 25.0,
          },
          {
            topicId: 'topic-2',
            topicName: 'Graph Traversal',
            masteryScore: 28.0,
            accuracy: 30.0,
            attemptsCount: 4,
            averageTimeSeconds: 90.0,
          },
        ],
        repeatedMistakes: [
          {
            mistakeType: 'conceptual',
            topicId: 'topic-2',
            topicName: 'Graph Traversal',
            count: 3,
          },
        ],
        recentQuizPerformance: [
          {
            score: 2,
            accuracy: 50.0,
            totalTimeSeconds: 150,
          },
        ],
      }),
    });

    if (!directDiagRes.ok) {
      throw new Error(`FastAPI direct diagnose failed with status ${directDiagRes.status}`);
    }
    const directDiagData = await directDiagRes.json();

    // Verify structured response conforms to Pydantic contract
    if (!directDiagData.diagnosisSummary || typeof directDiagData.diagnosisSummary !== 'string') {
      throw new Error('Diagnosis output missing diagnosisSummary');
    }
    if (!Array.isArray(directDiagData.weakTopics) || !directDiagData.weakTopics.includes('Graph Traversal')) {
      throw new Error('Expected "Graph Traversal" in weakTopics');
    }
    if (!Array.isArray(directDiagData.strongTopics) || !directDiagData.strongTopics.includes('Binary Trees')) {
      throw new Error('Expected "Binary Trees" in strongTopics');
    }
    if (!['low', 'medium', 'high'].includes(directDiagData.learningRisk)) {
      throw new Error(`Invalid learningRisk: ${directDiagData.learningRisk}`);
    }
    if (!Array.isArray(directDiagData.immediatePriorities) || directDiagData.immediatePriorities.length === 0) {
      throw new Error('immediatePriorities missing in output');
    }
    if (!Array.isArray(directDiagData.reasoning) || directDiagData.reasoning.length === 0) {
      throw new Error('reasoning missing in output');
    }
    console.log('✅ Direct /diagnose returned fully validated structured diagnosis:');
    console.log(`   - Risk: ${directDiagData.learningRisk}`);
    console.log(`   - Weak Topics: ${directDiagData.weakTopics.join(', ')}`);
    console.log(`   - Summary: ${directDiagData.diagnosisSummary}\n`);

    // ----------------------------------------------------
    // 4. Initialize In-Memory MongoDB & Node Backend
    // ----------------------------------------------------
    console.log('[4/10] Initializing MongoDB in-memory & Node.js backend...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    await mongoose.connect(uri);

    const { default: app } = await import('../server.js');
    const { default: Subject } = await import('../models/subject.model.js');
    const { default: Topic } = await import('../models/topic.model.js');
    const { default: Question } = await import('../models/question.model.js');

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
    // 5. Unauthorized AI endpoint protection test
    // ----------------------------------------------------
    console.log('[5/10] Testing unauthenticated POST /api/v1/ai/diagnose (Expects 401)...');
    const unauthAi = await fetch(`${baseUrl}/ai/diagnose`, { method: 'POST' });
    if (unauthAi.status !== 401) throw new Error(`Expected 401 for unauthenticated AI request, got ${unauthAi.status}`);
    console.log('✅ AI diagnosis endpoint correctly protected with 401.');

    // ----------------------------------------------------
    // 6. Seed curriculum & register student
    // ----------------------------------------------------
    console.log('[6/10] Seeding curriculum and registering student...');
    const subject = await Subject.create({ name: 'Data Structures', description: 'Core CS' });
    const bstTopic = await Topic.create({ subjectId: subject._id, name: 'Binary Search Trees' });
    const avlTopic = await Topic.create({ subjectId: subject._id, name: 'AVL Trees' });

    // Seed questions
    const q1 = await Question.create({
      topicId: bstTopic._id,
      questionText: 'BST Search Complexity?',
      options: ['O(log n)', 'O(n)'],
      correctOptionIndex: 0,
      difficulty: 'easy',
    });
    const q2 = await Question.create({
      topicId: avlTopic._id,
      questionText: 'AVL Balance Factor?',
      options: ['-1, 0, 1', 'any'],
      correctOptionIndex: 0,
      difficulty: 'hard',
    });

    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Taylor Swift', email: 'taylor@example.com', password: 'password123' }),
    });
    const authCookie = extractCookie(regRes);
    console.log('✅ Student registered and authenticated.');

    // ----------------------------------------------------
    // 7. Complete a quiz to establish telemetry
    // ----------------------------------------------------
    console.log('[7/10] Completing diagnostic quiz to generate student telemetry...');
    const startRes = await fetch(`${baseUrl}/quizzes/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ subjectId: subject._id, numberOfQuestions: 2 }),
    });
    const { data: { quizId } } = await startRes.json();

    // Answer Q1 correctly, Q2 incorrectly with conceptual mistake
    await fetch(`${baseUrl}/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ questionId: q1._id, selectedOption: 0, timeSpentSeconds: 15 }),
    });
    await fetch(`${baseUrl}/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ questionId: q2._id, selectedOption: 1, mistakeType: 'conceptual', timeSpentSeconds: 80 }),
    });

    await fetch(`${baseUrl}/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    console.log('✅ Telemetry established: Quiz completed with 1 correct, 1 conceptual mistake on AVL Trees.');

    // ----------------------------------------------------
    // 8. End-to-End Node.js → FastAPI diagnosis integration
    // ----------------------------------------------------
    console.log('[8/10] Testing Node.js -> FastAPI integration (POST /api/v1/ai/diagnose)...');
    const aiDiagRes = await fetch(`${baseUrl}/ai/diagnose`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });

    if (aiDiagRes.status !== 200) {
      const errText = await aiDiagRes.text();
      throw new Error(`Node AI diagnosis failed (${aiDiagRes.status}): ${errText}`);
    }

    const aiDiagData = await aiDiagRes.json();
    if (!aiDiagData.success || !aiDiagData.data || !aiDiagData.data.diagnosis) {
      throw new Error(`Invalid response structure from Node AI endpoint: ${JSON.stringify(aiDiagData)}`);
    }

    const diag = aiDiagData.data.diagnosis;
    console.log('  -> Received AI Diagnosis from FastAPI through Node backend:');
    console.log(`     Summary: ${diag.diagnosisSummary}`);
    console.log(`     Risk Level: ${diag.learningRisk}`);
    console.log(`     Weak Topics: ${JSON.stringify(diag.weakTopics)}`);
    console.log(`     Strong/Developing: ${JSON.stringify([...diag.strongTopics, ...diag.developingTopics])}`);
    console.log(`     Repeated Error Patterns: ${JSON.stringify(diag.repeatedErrorPatterns)}`);
    console.log(`     Immediate Priorities: ${JSON.stringify(diag.immediatePriorities)}`);
    console.log(`     Reasoning Count: ${diag.reasoning.length} items`);

    if (!diag.diagnosisSummary || !diag.learningRisk || !Array.isArray(diag.reasoning)) {
      throw new Error('Diagnosis response format validation failed');
    }
    console.log('✅ End-to-End Node.js -> FastAPI communication succeeded with valid structured payload.');

    // ----------------------------------------------------
    // 9. Negative Test: AI Microservice down / timeout simulation
    // ----------------------------------------------------
    console.log('[9/10] Testing error handling when AI microservice is unreachable (Expects 502)...');
    process.env.AI_SERVICE_URL = 'http://127.0.0.1:59999'; // Offline port
    const offlineAiRes = await fetch(`${baseUrl}/ai/diagnose`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    if (offlineAiRes.status !== 502) {
      throw new Error(`Expected 502 Bad Gateway when AI microservice is offline, got ${offlineAiRes.status}`);
    }
    const offlineErr = await offlineAiRes.json();
    console.log(`✅ Handled offline AI service gracefully with 502 Bad Gateway: "${offlineErr.message}"`);

    // ----------------------------------------------------
    // 10. Summary verification
    // ----------------------------------------------------
    console.log('[10/10] Resetting and verifying complete pipeline...');
    process.env.AI_SERVICE_URL = fastApiUrl;
    const finalCheck = await fetch(`${baseUrl}/ai/diagnose`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    if (finalCheck.status !== 200) throw new Error('Final check failed');
    console.log('✅ All Module 5 verification points passed seamlessly.');

    console.log('\n========================================================');
    console.log('🎉 ALL MODULE 5 AI DIAGNOSIS TESTS PASSED! 🎉');
    console.log('========================================================');
  } catch (err) {
    console.error('\n❌ MODULE 5 TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (pythonProc) {
      try {
        process.kill(pythonProc.pid);
      } catch (e) {}
    }
    if (nodeServer) nodeServer.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(process.exitCode || 0);
  }
};

runTests();
