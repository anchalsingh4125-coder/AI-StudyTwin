process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_module3_quizzes_12345';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;
let server;
let baseUrl;

const runTests = async () => {
  console.log('========================================');
  console.log('🚀 RUNNING MODULE 3 QUIZ ENGINE TESTS');
  console.log('========================================\n');

  try {
    // 1. Initialize In-Memory MongoDB Server
    console.log('[1/12] Initializing MongoMemoryServer...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
    console.log(`✅ MongoDB In-Memory instance active: ${uri}`);

    // Dynamic imports
    const { default: app } = await import('../server.js');
    const { default: Subject } = await import('../models/subject.model.js');
    const { default: Topic } = await import('../models/topic.model.js');
    const { default: Question } = await import('../models/question.model.js');
    const { default: User } = await import('../models/user.model.js');
    const { default: Quiz } = await import('../models/quiz.model.js');
    const { default: QuestionAttempt } = await import('../models/questionAttempt.model.js');

    // 2. Start Express app on dynamic test port
    const TEST_PORT = 5088;
    server = app.listen(TEST_PORT);
    baseUrl = `http://127.0.0.1:${TEST_PORT}/api/v1`;
    console.log(`✅ Test server listening at ${baseUrl}\n`);

    const extractCookie = (res) => {
      const setCookie = res.headers.get('set-cookie');
      if (!setCookie) return null;
      const match = setCookie.match(/token=([^;]+)/);
      return match ? `token=${match[1]}` : null;
    };

    // 3. Seed curriculum data
    console.log('[2/12] Seeding curriculum data (Subject, Topics, Questions)...');
    const subject = await Subject.create({
      name: 'Computer Science Core',
      description: 'Foundations of Computer Science'
    });

    const bstTopic = await Topic.create({
      subjectId: subject._id,
      name: 'Binary Search Trees',
      description: 'BST invariants and operations'
    });

    const osTopic = await Topic.create({
      subjectId: subject._id,
      name: 'Operating Systems Scheduling',
      description: 'Process scheduling policies'
    });

    const bstQuestions = await Question.insertMany([
      {
        topicId: bstTopic._id,
        questionText: 'What is the search time in a balanced BST?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
        correctOptionIndex: 1,
        explanation: 'Balanced BST height is logarithmic, giving O(log n).',
        difficulty: 'easy'
      },
      {
        topicId: bstTopic._id,
        questionText: 'Which traversal yields sorted output for a BST?',
        options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'],
        correctOptionIndex: 1,
        explanation: 'In-order traversal visits L, Root, R in sorted sequence.',
        difficulty: 'easy'
      },
      {
        topicId: bstTopic._id,
        questionText: 'What is the worst-case insertion time in an unbalanced BST?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n!)'],
        correctOptionIndex: 2,
        explanation: 'An unbalanced BST can degenerate into a line, taking O(n).',
        difficulty: 'medium'
      }
    ]);

    const unrelatedOsQuestion = await Question.create({
      topicId: osTopic._id,
      questionText: 'Which scheduling algorithm is non-preemptive?',
      options: ['Round Robin', 'FCFS', 'SRTF', 'Priority Preemptive'],
      correctOptionIndex: 1,
      explanation: 'First-Come First-Served is strictly non-preemptive.',
      difficulty: 'easy'
    });
    console.log(`✅ Seeded: 1 Subject, 2 Topics, 4 Questions`);

    // 4. Create and authenticate two distinct students
    console.log('[3/12] Registering and authenticating Test Student 1 and Student 2...');
    const regUser1 = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Student One', email: 'student1@example.com', password: 'password123' })
    });
    const cookieUser1 = extractCookie(regUser1);

    const regUser2 = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Student Two', email: 'student2@example.com', password: 'password123' })
    });
    const cookieUser2 = extractCookie(regUser2);
    console.log('✅ Both students registered and authenticated with distinct cookies.');

    // 5. Test Unauthorized Access
    console.log('[4/12] Testing unauthenticated access to /quizzes/start (Expects 401)...');
    const unauthStart = await fetch(`${baseUrl}/quizzes/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId: bstTopic._id })
    });
    if (unauthStart.status !== 401) throw new Error(`Expected 401, got ${unauthStart.status}`);
    console.log('✅ Unauthenticated access correctly blocked with 401');

    // 6. Test Starting Quiz & Answer Security
    console.log('[5/12] Testing POST /quizzes/start as Student 1...');
    const startRes = await fetch(`${baseUrl}/quizzes/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieUser1
      },
      body: JSON.stringify({
        topicId: bstTopic._id,
        numberOfQuestions: 3
      })
    });
    const startData = await startRes.json();
    if (startRes.status !== 201 || !startData.success) {
      throw new Error(`Failed to start quiz: ${JSON.stringify(startData)}`);
    }
    const quizId = startData.data.quizId;
    const questions = startData.data.questions;
    if (questions.length !== 3) {
      throw new Error(`Expected 3 questions, got ${questions.length}`);
    }

    // Verify correct answers and explanations are NOT leaked
    for (const q of questions) {
      if (q.correctOptionIndex !== undefined || q.explanation !== undefined) {
        throw new Error('SECURITY VIOLATION: Correct option or explanation leaked in /start response!');
      }
    }
    console.log(`✅ Quiz started (ID: ${quizId}). 3 questions retrieved without answer leaks.`);

    // 7. Test Answering an Invalid Question (not in quiz)
    console.log('[6/12] Testing answering an invalid question not in the quiz (Expects 400)...');
    const invalidQRes = await fetch(`${baseUrl}/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
      body: JSON.stringify({
        questionId: unrelatedOsQuestion._id,
        selectedOption: 1,
        timeSpentSeconds: 12
      })
    });
    if (invalidQRes.status !== 400) throw new Error(`Expected 400 for foreign question, got ${invalidQRes.status}`);
    console.log('✅ Attempt to answer question not belonging to quiz correctly blocked with 400');

    // 8. Test Valid Answers Recording
    console.log('[7/12] Recording answers for Student 1 questions...');
    // Q1: Answer correctly (BST search O(log n) -> index 1)
    const ans1 = await fetch(`${baseUrl}/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
      body: JSON.stringify({
        questionId: bstQuestions[0]._id,
        selectedOption: 1, // Correct
        timeSpentSeconds: 15
      })
    });
    if (ans1.status !== 200) throw new Error('Answer 1 failed');

    // Q2: Answer incorrectly with mistakeType 'conceptual' (BST in-order -> pick index 0 instead of 1)
    const ans2 = await fetch(`${baseUrl}/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
      body: JSON.stringify({
        questionId: bstQuestions[1]._id,
        selectedOption: 0, // Incorrect
        mistakeType: 'conceptual',
        timeSpentSeconds: 35
      })
    });
    if (ans2.status !== 200) throw new Error('Answer 2 failed');

    // Q3: Answer correctly (BST insertion worst case -> index 2)
    const ans3 = await fetch(`${baseUrl}/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
      body: JSON.stringify({
        questionId: bstQuestions[2]._id,
        selectedOption: 2, // Correct
        timeSpentSeconds: 20
      })
    });
    if (ans3.status !== 200) throw new Error('Answer 3 failed');
    console.log('✅ Recorded answers for 3 questions (2 correct, 1 conceptual mistake).');

    // 9. Test Unauthorized Quiz Access by Student 2 (Ownership Violation)
    console.log('[8/12] Testing quiz tampering by another student (Expects 403 Forbidden)...');
    const tamperRes = await fetch(`${baseUrl}/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: { Cookie: cookieUser2 }
    });
    if (tamperRes.status !== 403) throw new Error(`Expected 403 for unauthorized student, got ${tamperRes.status}`);
    console.log('✅ Cross-user tampering correctly rejected with 403 Forbidden.');

    // 10. Test Quiz Submission and Telemetry / Result Calculation
    console.log('[9/12] Testing POST /quizzes/:quizId/submit and telemetry evaluation...');
    const submitRes = await fetch(`${baseUrl}/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: { Cookie: cookieUser1 }
    });
    const submitData = await submitRes.json();
    if (submitRes.status !== 200 || !submitData.success) {
      throw new Error(`Submit failed: ${JSON.stringify(submitData)}`);
    }

    const resData = submitData.data;
    console.log('Result Data:', {
      score: resData.score,
      totalQuestions: resData.totalQuestions,
      correct: resData.correctAnswers,
      incorrect: resData.incorrectAnswers,
      accuracy: `${resData.accuracy}%`,
      totalTimeSeconds: `${resData.totalTimeSeconds}s`
    });

    if (resData.score !== 2 || resData.correctAnswers !== 2) {
      throw new Error(`Expected score 2, got ${resData.score}`);
    }
    if (resData.incorrectAnswers !== 1) {
      throw new Error(`Expected 1 incorrect answer, got ${resData.incorrectAnswers}`);
    }
    if (resData.totalTimeSeconds !== 70) { // 15 + 35 + 20
      throw new Error(`Expected 70 total seconds, got ${resData.totalTimeSeconds}`);
    }
    if (resData.accuracy !== 66.7) {
      throw new Error(`Expected 66.7% accuracy, got ${resData.accuracy}`);
    }
    if (!resData.topicPerformance || resData.topicPerformance.length === 0) {
      throw new Error('Topic performance telemetry missing');
    }
    if (!resData.difficultyPerformance || resData.difficultyPerformance.length === 0) {
      throw new Error('Difficulty performance telemetry missing');
    }
    console.log('✅ Result calculation & performance telemetry verified.');

    // 11. Test Duplicate Submission Prevention
    console.log('[10/12] Testing duplicate submission prevention (Expects 400 Bad Request)...');
    const dupSubmitRes = await fetch(`${baseUrl}/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: { Cookie: cookieUser1 }
    });
    if (dupSubmitRes.status !== 400) {
      throw new Error(`Expected 400 for duplicate submit, got ${dupSubmitRes.status}`);
    }
    console.log('✅ Duplicate submission correctly prevented with 400 Bad Request.');

    // 12. Test Answering Question on Completed Quiz
    console.log('[11/12] Testing answering on a completed quiz (Expects 400 Bad Request)...');
    const postCompleteAns = await fetch(`${baseUrl}/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
      body: JSON.stringify({ questionId: bstQuestions[0]._id, selectedOption: 0 })
    });
    if (postCompleteAns.status !== 400) {
      throw new Error(`Expected 400 for answering completed quiz, got ${postCompleteAns.status}`);
    }
    console.log('✅ Modification to completed quiz correctly prohibited with 400.');

    // 13. Test GET /quizzes/:quizId/result and GET /quizzes/history
    console.log('[12/12] Testing GET /quizzes/:quizId/result and GET /quizzes/history...');
    const resultRes = await fetch(`${baseUrl}/quizzes/${quizId}/result`, {
      headers: { Cookie: cookieUser1 }
    });
    const resultData = await resultRes.json();
    if (resultRes.status !== 200 || !resultData.success) {
      throw new Error(`Failed to get result: ${JSON.stringify(resultData)}`);
    }
    if (resultData.data.attempts.length !== 3) {
      throw new Error(`Expected 3 detailed attempts, got ${resultData.data.attempts.length}`);
    }
    const conceptualMistake = resultData.data.attempts.find((a) => a.mistakeType === 'conceptual');
    if (!conceptualMistake) {
      throw new Error('Expected mistakeType "conceptual" to be present in question attempt');
    }

    const historyRes = await fetch(`${baseUrl}/quizzes/history`, {
      headers: { Cookie: cookieUser1 }
    });
    const historyData = await historyRes.json();
    if (historyRes.status !== 200 || historyData.count !== 1) {
      throw new Error(`Failed to fetch history: ${JSON.stringify(historyData)}`);
    }
    console.log(`✅ GET /result returned full review with explanations. GET /history returned ${historyData.count} completed quiz.`);

    console.log('\n========================================');
    console.log('🎉 ALL 12 QUIZ ENGINE TESTS PASSED! 🎉');
    console.log('========================================');
  } catch (err) {
    console.error('\n❌ MODULE 3 TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(process.exitCode || 0);
  }
};

runTests();
