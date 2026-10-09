import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Brain,
  BarChart2,
  RefreshCw,
  Zap,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import useAuthStore from '../store/authStore.js';
import analyticsService from '../services/analytics.service.js';
import aiService from '../services/ai.service.js';
import ReadinessRing from '../components/ReadinessRing.jsx';
import MasteryBarChart from '../components/MasteryBarChart.jsx';
import DiagnosisCard from '../components/DiagnosisCard.jsx';
import RecommendationCard from '../components/RecommendationCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [topics, setTopics] = useState([]);
  const [diagnosis, setDiagnosis] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [isRefreshingRecs, setIsRefreshingRecs] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Concurrent retrieval of dashboard metrics
      const [overviewData, topicsData, recsData] = await Promise.allSettled([
        analyticsService.getOverview(),
        analyticsService.getTopics(),
        aiService.getRecommendations(),
      ]);

      if (overviewData.status === 'fulfilled') setOverview(overviewData.value);
      if (topicsData.status === 'fulfilled') setTopics(topicsData.value.allTopics || []);
      if (recsData.status === 'fulfilled') setRecommendations(recsData.value);

      // Attempt to load active AI diagnosis
      try {
        const diag = await aiService.diagnoseStudent();
        setDiagnosis(diag);
      } catch (dErr) {
        console.warn('Initial diagnosis fetch note:', dErr.message);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Unable to load some dashboard metrics. Please check that the server is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefreshRecommendations = async () => {
    try {
      setIsRefreshingRecs(true);
      const updated = await aiService.generateFreshRecommendations();
      setRecommendations(updated);
    } catch (err) {
      console.error('Failed to refresh recommendations:', err);
    } finally {
      setIsRefreshingRecs(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Calibrating your AI StudyTwin profile..." />;
  }

  const readinessScore = overview?.overallReadinessScore || 0;
  const actionItems = recommendations?.actionItems || [];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Welcome & Headline Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-base-content">
              Welcome back, {user?.name || 'Student'} 👋
            </h1>
          </div>
          <p className="text-xs md:text-sm text-base-content/70">
            Your Digital Cognitive Twin has calibrated your recent telemetry. Here is your current learning status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/quiz')}
            className="btn btn-primary btn-sm gap-2 font-bold shadow-sm"
          >
            <Brain className="w-4 h-4" />
            Take a Quiz
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="btn btn-outline btn-sm gap-1.5"
          >
            <BarChart2 className="w-4 h-4" />
            Analytics
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning text-xs py-3">
          <span>{error}</span>
        </div>
      )}

      {/* 2. Quick Stat Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Quizzes Taken</div>
          <div className="stat-value text-2xl text-primary font-black mt-1">
            {overview?.totalQuizzesCompleted || 0}
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">Completed sessions</div>
        </div>

        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Overall Accuracy</div>
          <div className="stat-value text-2xl text-secondary font-black mt-1">
            {overview?.overallAccuracy ? `${Math.round(overview.overallAccuracy)}%` : '0%'}
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">Across all question attempts</div>
        </div>

        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Questions Solved</div>
          <div className="stat-value text-2xl text-accent font-black mt-1">
            {overview?.totalQuestionsAttempted || 0}
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">Telemetry data points</div>
        </div>

        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Avg Response Time</div>
          <div className="stat-value text-2xl text-info font-black mt-1">
            {overview?.averageQuestionTimeSeconds ? `${overview.averageQuestionTimeSeconds}s` : '0s'}
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">Per question latency</div>
        </div>
      </div>

      {/* 3. Readiness Ring & Mastery Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <ReadinessRing score={readinessScore} />
        </div>
        <div className="lg:col-span-7">
          <MasteryBarChart topics={topics} />
        </div>
      </div>

      {/* 4. AI Diagnosis Card */}
      <DiagnosisCard diagnosis={diagnosis} onDiagnosisUpdated={(d) => setDiagnosis(d)} />

      {/* 5. Adaptive AI Recommendations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-base-200 pb-3">
          <div>
            <h3 className="text-xl font-bold text-base-content flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Adaptive Study Recommendations
            </h3>
            <p className="text-xs text-base-content/60">
              Personalized action items derived from your weak areas, mistakes, and pacing
            </p>
          </div>

          <button
            onClick={handleRefreshRecommendations}
            disabled={isRefreshingRecs}
            className="btn btn-ghost btn-xs text-primary gap-1"
            title="Re-run recommendation engine"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRecs ? 'animate-spin' : ''}`} />
            {isRefreshingRecs ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {actionItems.length === 0 ? (
          <div className="card bg-base-100 p-8 border border-base-200 text-center space-y-3">
            <Zap className="w-10 h-10 text-primary mx-auto opacity-70" />
            <h4 className="font-bold text-base text-base-content">No Active Recommendations Yet</h4>
            <p className="text-xs text-base-content/60 max-w-md mx-auto">
              Start by taking a diagnostic quiz. The AI engine will immediately analyze your performance and populate tailored action steps.
            </p>
            <button onClick={() => navigate('/quiz')} className="btn btn-primary btn-sm mx-auto gap-2">
              <Brain className="w-4 h-4" />
              Take First Quiz
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {actionItems.map((item, idx) => (
              <RecommendationCard key={idx} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
