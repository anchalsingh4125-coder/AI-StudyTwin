import dotenv from 'dotenv';
import connectDB, { disconnectDB } from '../config/db.js';
import Subject from '../models/subject.model.js';
import Topic from '../models/topic.model.js';
import Question from '../models/question.model.js';

dotenv.config();

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await connectDB();

    console.log('[Seed] Clearing existing curriculum data...');
    await Question.deleteMany({});
    await Topic.deleteMany({});
    await Subject.deleteMany({});

    // 1. Subject: Data Structures & Algorithms
    const dsaSubject = await Subject.create({
      name: 'Data Structures & Algorithms',
      description: 'Fundamental linear and non-linear data structures, trees, graphs, and algorithmic complexity.',
    });

    const bstTopic = await Topic.create({
      subjectId: dsaSubject._id,
      name: 'Binary Search Trees',
      description: 'Binary search tree invariants, traversal methods, insertions, deletions, and self-balancing concepts.',
    });

    const graphsTopic = await Topic.create({
      subjectId: dsaSubject._id,
      name: 'Graph Algorithms',
      description: 'Graph representations, BFS, DFS, shortest path algorithms (Dijkstra), and minimum spanning trees.',
    });

    // 2. Subject: Operating Systems
    const osSubject = await Subject.create({
      name: 'Operating Systems',
      description: 'Core concepts in process scheduling, memory virtualization, synchronization, and storage architectures.',
    });

    const syncTopic = await Topic.create({
      subjectId: osSubject._id,
      name: 'Process Synchronization & Deadlocks',
      description: 'Race conditions, critical section problem, mutexes, semaphores, and Coffman deadlock conditions.',
    });

    const memoryTopic = await Topic.create({
      subjectId: osSubject._id,
      name: 'Virtual Memory & Paging',
      description: 'Page tables, TLB, page replacement policies (FIFO, LRU), and thrashing phenomena.',
    });

    // Seed Questions for BST
    await Question.insertMany([
      {
        topicId: bstTopic._id,
        questionText: 'What is the average time complexity of searching for a value in a balanced Binary Search Tree?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctOptionIndex: 1,
        explanation: 'In a balanced binary search tree, the height is logarithmic: h = floor(log2(n)). Search takes O(log n).',
        difficulty: 'easy',
      },
      {
        topicId: bstTopic._id,
        questionText: 'Which traversal algorithm produces node values in monotonically non-decreasing order for any BST?',
        options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'],
        correctOptionIndex: 1,
        explanation: 'In-order traversal explores Left -> Root -> Right, which naturally outputs elements in sorted order.',
        difficulty: 'easy',
      },
      {
        topicId: bstTopic._id,
        questionText: 'What is the worst-case time complexity of inserting n already-sorted keys into an unbalanced BST?',
        options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'],
        correctOptionIndex: 2,
        explanation: 'Each insertion encounters a degenerate linked-list tree with depth i, leading to 1 + 2 + ... + n = O(n^2) total time.',
        difficulty: 'medium',
      },
      {
        topicId: bstTopic._id,
        questionText: 'In an AVL tree, what is the maximum permissible difference between heights of left and right subtrees of any node?',
        options: ['0', '1', '2', 'log n'],
        correctOptionIndex: 1,
        explanation: 'The balance factor in an AVL tree must strictly be -1, 0, or 1; otherwise a rotation is triggered.',
        difficulty: 'medium',
      },
      {
        topicId: bstTopic._id,
        questionText: 'During deletion of a node with two children in a BST, which node can safely replace the deleted node to maintain BST properties?',
        options: ['Its left child', 'Its right child', 'Its in-order predecessor or in-order successor', 'Any leaf node in the tree'],
        correctOptionIndex: 2,
        explanation: 'The in-order predecessor (maximum in left subtree) or in-order successor (minimum in right subtree) can replace the node without violating BST invariants.',
        difficulty: 'hard',
      },
    ]);

    // Seed Questions for Graph Algorithms
    await Question.insertMany([
      {
        topicId: graphsTopic._id,
        questionText: 'Which data structure is primarily used to implement Breadth-First Search (BFS)?',
        options: ['Stack', 'Queue', 'Priority Queue', 'Disjoint Set'],
        correctOptionIndex: 1,
        explanation: 'BFS explores vertices layer by layer in FIFO order using a Queue.',
        difficulty: 'easy',
      },
      {
        topicId: graphsTopic._id,
        questionText: 'What is the standard time complexity of Dijkstra’s algorithm using a Min-Heap (Priority Queue)?',
        options: ['O(V^2)', 'O(E + V log V)', 'O((V + E) log V)', 'O(V * E)'],
        correctOptionIndex: 2,
        explanation: 'With an adjacency list and binary min-heap, extracting min takes O(V log V) and updating edge weights takes O(E log V), yielding O((V + E) log V).',
        difficulty: 'medium',
      },
    ]);

    // Seed Questions for Process Synchronization
    await Question.insertMany([
      {
        topicId: syncTopic._id,
        questionText: 'Which of the following is NOT one of Coffman’s four necessary conditions for a Deadlock?',
        options: ['Mutual Exclusion', 'Hold and Wait', 'No Preemption', 'Round-Robin Scheduling'],
        correctOptionIndex: 3,
        explanation: 'The four Coffman conditions are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Round-Robin is a CPU scheduling policy.',
        difficulty: 'easy',
      },
      {
        topicId: syncTopic._id,
        questionText: 'What problem can arise if two processes execute wait(semaphore) in reverse order on two binary semaphores?',
        options: ['Deadlock', 'Starvation only', 'Priority Inversion', 'Thrashing'],
        correctOptionIndex: 0,
        explanation: 'If Process 1 acquires S1 and awaits S2 while Process 2 acquires S2 and awaits S1, circular wait occurs resulting in Deadlock.',
        difficulty: 'medium',
      },
    ]);

    // Seed Questions for Virtual Memory
    await Question.insertMany([
      {
        topicId: memoryTopic._id,
        questionText: 'What is Belady’s Anomaly in page replacement algorithms?',
        options: [
          'Increasing page frames results in more page faults in FIFO',
          'LRU requires exponential memory',
          'Page size decreases under high disk I/O',
          'Virtual address space exceeds physical memory size'
        ],
        correctOptionIndex: 0,
        explanation: 'Belady’s anomaly occurs in FIFO replacement where allocating more physical page frames unexpectedly increases the total number of page faults.',
        difficulty: 'medium',
      },
    ]);

    console.log('[Seed] Curriculum database seeded successfully!');
    console.log(`[Seed] 2 Subjects, 4 Topics, 10 Questions created.`);
  } catch (error) {
    console.error('[Seed Error]:', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

seedData();
