import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import subjectRoutes from './routes/subject.routes.js';
import topicRoutes from './routes/topic.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import aiRoutes from './routes/ai.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration with credentials support for httpOnly cookies
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/subjects', subjectRoutes);
app.use('/api/v1/topics', topicRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/ai', aiRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'AI StudyTwin Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      subjects: '/api/v1/subjects',
      topics: '/api/v1/topics',
      quizzes: '/api/v1/quizzes',
      analytics: '/api/v1/analytics',
      ai: '/api/v1/ai',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Unhandled Error]:', err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start server and connect to database
const startServer = async () => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectDB();
    }
  } catch (error) {
    console.error(`[Server Warning] MongoDB connection failed: ${error.message}`);
    console.error('[Server Warning] Continuing server boot. Ensure MongoDB is running and MONGODB_URI is valid.');
  }

  app.listen(PORT, () => {
    console.log(`[AI StudyTwin Backend] Server running on port ${PORT}`);
    console.log(`[AI StudyTwin Backend] Health Check: http://localhost:${PORT}/api/v1/health`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
