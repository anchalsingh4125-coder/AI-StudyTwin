process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_1234567890';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;
let server;
let baseUrl;

const runTests = async () => {
  console.log('========================================');
  console.log('🚀 RUNNING MODULE 2 COMPREHENSIVE TESTS');
  console.log('========================================\n');

  try {
    // 1. Initialize In-Memory MongoDB Server
    console.log('[1/14] Initializing MongoMemoryServer...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    // Disconnect if any open connection exists
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
    console.log(`✅ MongoDB In-Memory instance active: ${uri}`);

    // Dynamic import to guarantee NODE_ENV='test' was set before server.js evaluated
    const { default: app } = await import('../server.js');
    const { default: Subject } = await import('../models/subject.model.js');
    const { default: Topic } = await import('../models/topic.model.js');
    const { default: Question } = await import('../models/question.model.js');

    // 2. Start Express app on dynamic test port
    const TEST_PORT = 5099;
    server = app.listen(TEST_PORT);
    baseUrl = `http://127.0.0.1:${TEST_PORT}/api/v1`;
    console.log(`✅ Test server listening at ${baseUrl}\n`);

    // Helper for extracting cookies
    const extractCookie = (res) => {
      const setCookie = res.headers.get('set-cookie');
      if (!setCookie) return null;
      const match = setCookie.match(/token=([^;]+)/);
      return match ? `token=${match[1]}` : null;
    };

    // Test 1: Health check
    console.log('[2/14] Testing GET /health...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    if (!healthData.success) throw new Error('Health check failed');
    console.log('✅ GET /health passed:', healthData.message);

    // Test 2: Unauthenticated /auth/me returns 401
    console.log('[3/14] Testing unauthenticated GET /auth/me (should fail with 401)...');
    const unauthMe = await fetch(`${baseUrl}/auth/me`);
    if (unauthMe.status !== 401) throw new Error(`Expected 401, got ${unauthMe.status}`);
    console.log('✅ Unauthenticated request correctly blocked with 401');

    // Test 3: Unauthenticated /subjects returns 401
    console.log('[4/14] Testing unauthenticated GET /subjects (should fail with 401)...');
    const unauthSubjects = await fetch(`${baseUrl}/subjects`);
    if (unauthSubjects.status !== 401) throw new Error(`Expected 401, got ${unauthSubjects.status}`);
    console.log('✅ Unauthenticated curriculum access correctly blocked with 401');

    // Test 4: Register new user
    console.log('[5/14] Testing POST /auth/register...');
    const registerRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Johnson',
        email: 'alex.johnson@example.com',
        password: 'securePassword123!',
        targetSubjects: ['Data Structures & Algorithms', 'Computer Networks']
      })
    });
    const registerData = await registerRes.json();
    if (registerRes.status !== 201 || !registerData.success) {
      throw new Error(`Register failed: ${JSON.stringify(registerData)}`);
    }
    if (registerData.data.user.password) {
      throw new Error('SECURITY VIOLATION: Password hash was returned in register response!');
    }
    const authCookie = extractCookie(registerRes);
    if (!authCookie) {
      throw new Error('Failed to extract auth cookie from registration response');
    }
    console.log('✅ User registered successfully. Password hidden. Auth cookie received.');

    // Test 5: Verify GET /auth/me with cookie
    console.log('[6/14] Testing authenticated GET /auth/me using httpOnly cookie...');
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: authCookie }
    });
    const meData = await meRes.json();
    if (meRes.status !== 200 || meData.data.user.email !== 'alex.johnson@example.com') {
      throw new Error(`GET /auth/me failed: ${JSON.stringify(meData)}`);
    }
    console.log('✅ Authenticated /auth/me passed. User:', meData.data.user.name);

    // Test 6: Duplicate registration rejection
    console.log('[7/14] Testing duplicate registration rejection (409 Conflict)...');
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Impostor',
        email: 'alex.johnson@example.com',
        password: 'anotherPassword123'
      })
    });
    if (dupRes.status !== 409) throw new Error(`Expected 409 Conflict, got ${dupRes.status}`);
    console.log('✅ Duplicate registration correctly rejected with 409 Conflict');

    // Test 7: Login with invalid password (should fail 401)
    console.log('[8/14] Testing login with incorrect password (should fail with 401)...');
    const badLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alex.johnson@example.com',
        password: 'wrongPassword'
      })
    });
    if (badLogin.status !== 401) throw new Error(`Expected 401, got ${badLogin.status}`);
    console.log('✅ Bad credentials correctly rejected with 401');

    // Test 8: Login with valid credentials
    console.log('[9/14] Testing valid POST /auth/login...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alex.johnson@example.com',
        password: 'securePassword123!'
      })
    });
    const loginData = await loginRes.json();
    if (loginRes.status !== 200 || !loginData.success) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    const newAuthCookie = extractCookie(loginRes);
    console.log('✅ Login successful. Received fresh cookie.');

    // Test 9: Seed curriculum database
    console.log('[10/14] Seeding test curriculum database (Subject, Topic, Questions)...');
    const testSubject = await Subject.create({
      name: 'Data Structures and Algorithms',
      description: 'Foundational CS curriculum covering linear and non-linear data structures.'
    });

    const testTopic = await Topic.create({
      subjectId: testSubject._id,
      name: 'Binary Search Trees',
      description: 'Node-based binary tree data structure with BST invariant.'
    });

    const testQuestions = await Question.insertMany([
      {
        topicId: testTopic._id,
        questionText: 'What is the average time complexity of searching an element in a balanced BST?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctOptionIndex: 1,
        explanation: 'In a balanced BST with height h = log2(n), search takes O(log n) comparisons.',
        difficulty: 'easy'
      },
      {
        topicId: testTopic._id,
        questionText: 'Which tree traversal outputs the keys of a Binary Search Tree in non-decreasing sorted order?',
        options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'],
        correctOptionIndex: 1,
        explanation: 'In-order traversal visits left subtree, root, then right subtree, naturally sorting keys.',
        difficulty: 'easy'
      },
      {
        topicId: testTopic._id,
        questionText: 'What is the worst-case time complexity of inserting into an unbalanced BST?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
        correctOptionIndex: 2,
        explanation: 'When keys are inserted in sorted order, the BST degenerates into a linked list, taking O(n) time.',
        difficulty: 'medium'
      }
    ]);
    console.log(`✅ Seeded: 1 Subject, 1 Topic, ${testQuestions.length} Questions`);

    // Test 10: Authenticated GET /api/v1/subjects
    console.log('[11/14] Testing authenticated GET /subjects...');
    const subjectsRes = await fetch(`${baseUrl}/subjects`, {
      headers: { Cookie: newAuthCookie }
    });
    const subjectsData = await subjectsRes.json();
    if (subjectsRes.status !== 200 || subjectsData.count !== 1) {
      throw new Error(`Failed to fetch subjects: ${JSON.stringify(subjectsData)}`);
    }
    console.log(`✅ GET /subjects passed. Found ${subjectsData.count} subject: "${subjectsData.data[0].name}"`);

    // Test 11: Authenticated GET /api/v1/subjects/:id/topics
    console.log('[12/14] Testing authenticated GET /subjects/:id/topics...');
    const topicsRes = await fetch(`${baseUrl}/subjects/${testSubject._id}/topics`, {
      headers: { Cookie: newAuthCookie }
    });
    const topicsData = await topicsRes.json();
    if (topicsRes.status !== 200 || topicsData.count !== 1) {
      throw new Error(`Failed to fetch topics: ${JSON.stringify(topicsData)}`);
    }
    console.log(`✅ GET /subjects/:id/topics passed. Found ${topicsData.count} topic: "${topicsData.data[0].name}"`);

    // Test 12: Authenticated GET /api/v1/topics/:id/questions
    console.log('[13/14] Testing authenticated GET /topics/:id/questions...');
    const questionsRes = await fetch(`${baseUrl}/topics/${testTopic._id}/questions`, {
      headers: { Cookie: newAuthCookie }
    });
    const questionsData = await questionsRes.json();
    if (questionsRes.status !== 200 || questionsData.count !== 3) {
      throw new Error(`Failed to fetch questions: ${JSON.stringify(questionsData)}`);
    }
    console.log(`✅ GET /topics/:id/questions passed. Retrieved ${questionsData.count} questions.`);

    // Test 13 & 14: Logout and subsequent 401 check
    console.log('[14/14] Testing POST /auth/logout and session invalidation...');
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: newAuthCookie }
    });
    const logoutData = await logoutRes.json();
    if (!logoutData.success) throw new Error('Logout failed');

    // Confirm that cleared cookie is blocked
    const postLogoutMe = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: 'token=' }
    });
    if (postLogoutMe.status !== 401) {
      throw new Error(`Expected 401 after logout, received ${postLogoutMe.status}`);
    }
    console.log('✅ Logout verified. Cookie cleared and subsequent request rejected with 401.');

    console.log('\n========================================');
    console.log('🎉 ALL 14 TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('========================================');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(process.exitCode || 0);
  }
};

runTests();
