import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Brain,
  TrendingUp,
  AlertTriangle,
  Clock,
  Target,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import analyticsService from '../services/analytics.service.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ReadinessRing from '../components/ReadinessRing.jsx';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [topicData, setTopicData] = useState(null);
  const [mistakes, setMistakes] = useState(null);
  const [readiness, setReadiness] = useState(null);

  // Filter state for topic mastery list
  const [selectedTierFilter, setSelectedTierFilter] = useState('all');

  const fetchAnalytics = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [resOverview, resTopics, resMistakes, resReadiness] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getTopics(),
        analyticsService.getMistakes(),
        analyticsService.getReadiness(),
      ]);

      setOverview(resOverview);
      setTopicData(resTopics);
      setMistakes(resMistakes);
      setReadiness(resReadiness);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Unable to load analytics data. Ensure the backend server is reachable.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Aggregating cognitive performance metrics..." />;
  }

  const allTopics = topicData?.allTopics || [];
  const filteredTopics = selectedTierFilter === 'all'
    ? allTopics
    : allTopics.filter((t) => t.tier === selectedTierFilter);

  const mistakeDistribution = mistakes?.mistakeTypeDistribution || {
    conceptual: 0,
    careless: 0,
    time_pressure: 0,
    unattempted: 0,
  };
  const totalMistakes = mistakes?.totalMistakesRecorded || 0;

  const mistakeDescriptions = {
    conceptual: 'Lacks fundamental theoretical model or misconception on key properties.',
    careless: 'Understood core concept but made computation, notation, or oversight slips.',
    time_pressure: 'Rushed response leading to errors under time stress (<10s latency).',
    unattempted: 'Timed out or skipped question entirely without choosing an option.',
  };

  const getTierColorClass = (tier) => {
    switch (tier) {
      case 'mastered':
        return 'text-accent border-accent/30 bg-accent/10';
      case 'strong':
        return 'text-success border-success/30 bg-success/10';
      case 'developing':
        return 'text-warning border-warning/30 bg-warning/10';
      case 'weak':
      default:
        return 'text-error border-error/30 bg-error/10';
    }
  };

  const getTierProgressBarClass = (tier) => {
    switch (tier) {
      case 'mastered':
        return 'progress-accent';
      case 'strong':
        return 'progress-success';
      case 'developing':
        return 'progress-warning';
      case 'weak':
      default:
        return 'progress-error';
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header with Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-black text-base-content">Cognitive Analytics & Telemetry</h1>
          </div>
          <p className="text-xs md:text-sm text-base-content/70">
            Multi-factor weighted analysis based on accuracy, difficulty scaling, latency, and mistake recurrence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="btn btn-outline btn-sm gap-1.5"
            title="Reload telemetry data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Updating...' : 'Refresh Metrics'}
          </button>
          <button
            onClick={() => navigate('/quiz')}
            className="btn btn-primary btn-sm gap-1.5 font-bold"
          >
            <Brain className="w-4 h-4" /> Take Quiz
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning text-xs py-3">
          <span>{error}</span>
        </div>
      )}

      {/* 2. Primary KPI Overview Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Readiness Score</div>
          <div className="stat-value text-2xl text-primary font-black mt-1">
            {readiness?.readinessScore ?? overview?.overallReadinessScore ?? 0}%
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">
            {readiness?.readinessTier || 'Calibrating'}
          </div>
        </div>

        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Quizzes Completed</div>
          <div className="stat-value text-2xl text-secondary font-black mt-1">
            {overview?.totalQuizzesCompleted || 0}
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">Full sessions</div>
        </div>

        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Total Solved</div>
          <div className="stat-value text-2xl text-accent font-black mt-1">
            {overview?.totalQuestionsAttempted || 0}
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">Question attempts</div>
        </div>

        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Overall Accuracy</div>
          <div className="stat-value text-2xl text-info font-black mt-1">
            {overview?.overallAccuracy ? `${Math.round(overview.overallAccuracy)}%` : '0%'}
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">Historical rate</div>
        </div>

        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="stat-title text-xs font-semibold text-base-content/60">Curriculum Coverage</div>
          <div className="stat-value text-2xl text-success font-black mt-1">
            {readiness?.curriculumCoverage?.coveragePercentage ?? 0}%
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">
            {readiness?.curriculumCoverage?.topicsPracticed ?? 0} of {readiness?.curriculumCoverage?.totalTopicsInCurriculum ?? 0} topics
          </div>
        </div>
      </div>

      {/* 3. Readiness Ring & Tier Distribution Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <ReadinessRing score={readiness?.readinessScore ?? overview?.overallReadinessScore ?? 0} />
        </div>

        <div className="lg:col-span-7 card bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base text-base-content">Cognitive Tier Breakdown</h3>
            </div>
            <p className="text-xs text-base-content/60 mb-6">
              Distribution of topics currently categorized across the 4 cognitive mastery tiers.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-error/30 bg-error/5 text-center">
                <span className="text-xs font-bold text-error uppercase block">Weak (&lt;40)</span>
                <span className="text-2xl font-black text-error mt-1 block">
                  {overview?.topicCountsByTier?.weak || 0}
                </span>
                <span className="text-[10px] text-base-content/60">Needs Review</span>
              </div>

              <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 text-center">
                <span className="text-xs font-bold text-warning uppercase block">Developing (40-69)</span>
                <span className="text-2xl font-black text-warning mt-1 block">
                  {overview?.topicCountsByTier?.developing || 0}
                </span>
                <span className="text-[10px] text-base-content/60">Moderate</span>
              </div>

              <div className="p-4 rounded-xl border border-success/30 bg-success/5 text-center">
                <span className="text-xs font-bold text-success uppercase block">Strong (70-84)</span>
                <span className="text-2xl font-black text-success mt-1 block">
                  {overview?.topicCountsByTier?.strong || 0}
                </span>
                <span className="text-[10px] text-base-content/60">Competent</span>
              </div>

              <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 text-center">
                <span className="text-xs font-bold text-accent uppercase block">Mastered (85-100)</span>
                <span className="text-2xl font-black text-accent mt-1 block">
                  {overview?.topicCountsByTier?.mastered || 0}
                </span>
                <span className="text-[10px] text-base-content/60">Exam Ready</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-base-200 flex items-center justify-between text-xs text-base-content/70">
            <span>Average latency per question: <strong>{overview?.averageQuestionTimeSeconds || 0} seconds</strong></span>
            <span>Last calibrated: <strong>{readiness?.lastUpdated ? new Date(readiness.lastUpdated).toLocaleTimeString() : 'Recent'}</strong></span>
          </div>
        </div>
      </div>

      {/* 4. Granular Topic Mastery Matrix */}
      <div className="card bg-base-100 shadow-sm border border-base-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-200 pb-4">
          <div>
            <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Granular Topic Mastery Matrix
            </h3>
            <p className="text-xs text-base-content/60">
              Computed mastery score, attempts, accuracy, and average latency per topic
            </p>
          </div>

          {/* Tier Filter Tabs */}
          <div className="join bg-base-200 p-1 rounded-xl text-xs">
            {['all', 'weak', 'developing', 'strong', 'mastered'].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTierFilter(tier)}
                className={`join-item btn btn-xs capitalize font-semibold ${
                  selectedTierFilter === tier ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {filteredTopics.length === 0 ? (
          <div className="p-8 text-center text-xs text-base-content/60 space-y-2">
            <Zap className="w-8 h-8 text-primary mx-auto opacity-50" />
            <p>No topics found matching the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-xs">
              <thead>
                <tr className="border-b border-base-200 text-base-content/70">
                  <th>Topic & Subject</th>
                  <th>Mastery Score</th>
                  <th>Status Tier</th>
                  <th>Accuracy</th>
                  <th>Attempts</th>
                  <th>Avg Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopics.map((topic) => (
                  <tr key={topic.topicId} className="hover:bg-base-200/50 transition-colors">
                    <td>
                      <div>
                        <span className="font-bold text-sm text-base-content block">{topic.topicName}</span>
                        <span className="text-[11px] text-base-content/50">{topic.subjectName}</span>
                      </div>
                    </td>

                    <td className="w-48">
                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-xs">
                          <span>{topic.masteryScore}%</span>
                        </div>
                        <progress
                          className={`progress ${getTierProgressBarClass(topic.tier)} w-full h-2`}
                          value={topic.masteryScore}
                          max="100"
                        ></progress>
                      </div>
                    </td>

                    <td>
                      <span className={`badge badge-sm font-bold border uppercase text-[10px] ${getTierColorClass(topic.tier)}`}>
                        {topic.tier}
                      </span>
                    </td>

                    <td className="font-semibold">
                      {Math.round(topic.accuracy)}% ({topic.correctCount}/{topic.attemptsCount})
                    </td>

                    <td>{topic.attemptsCount} solved</td>

                    <td className="font-mono text-base-content/70">
                      {topic.averageTimeSeconds}s
                    </td>

                    <td>
                      <button
                        onClick={() => navigate(`/quiz?topicId=${topic.topicId}`)}
                        className="btn btn-primary btn-xs gap-1 font-semibold"
                        title="Practice questions for this topic"
                      >
                        Drill <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Repeated Mistake Pattern & Misconception Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mistake Distribution Chart */}
        <div className="lg:col-span-5 card bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-base-content flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Cognitive Mistake Taxonomy
            </h3>
            <p className="text-xs text-base-content/60">
              Categorization across {totalMistakes} recorded errors
            </p>
          </div>

          <div className="space-y-4">
            {Object.entries(mistakeDistribution).map(([type, count]) => {
              const pct = totalMistakes > 0 ? Math.round((count / totalMistakes) * 100) : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold capitalize text-base-content">
                      {type.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-base-content/70">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <progress
                    className={`progress w-full h-2 ${
                      type === 'conceptual'
                        ? 'progress-error'
                        : type === 'careless'
                        ? 'progress-warning'
                        : type === 'time_pressure'
                        ? 'progress-info'
                        : 'progress-secondary'
                    }`}
                    value={pct}
                    max="100"
                  ></progress>
                  <p className="text-[11px] text-base-content/50 leading-tight">
                    {mistakeDescriptions[type]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vulnerable Topic Spots & Recurring Patterns */}
        <div className="lg:col-span-7 card bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-base-content flex items-center gap-2">
              <Target className="w-5 h-5 text-error" />
              Vulnerable Topic Misconception Spots
            </h3>
            <p className="text-xs text-base-content/60">
              Specific topics exhibiting recurring error tendencies
            </p>
          </div>

          {mistakes?.repeatedMistakePatterns?.length === 0 ? (
            <div className="p-8 text-center text-xs text-base-content/60 space-y-2">
              <CheckCircle className="w-8 h-8 text-success mx-auto" />
              <p>No repeated mistake patterns detected. Excellent consistency!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="border-b border-base-200 text-base-content/70">
                    <th>Vulnerable Topic</th>
                    <th>Error Pattern</th>
                    <th>Recurrence</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mistakes?.repeatedMistakePatterns?.slice(0, 5).map((pat, idx) => (
                    <tr key={idx} className="hover:bg-base-200/50">
                      <td className="font-bold text-base-content">{pat.topicName}</td>
                      <td>
                        <span className="badge badge-error badge-outline badge-xs uppercase font-bold py-2">
                          {pat.mistakeType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="font-bold text-error">
                        {pat.count} {pat.count === 1 ? 'error' : 'errors'}
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/quiz?topicId=${pat.topicId}`)}
                          className="btn btn-ghost btn-xs text-primary gap-1"
                        >
                          Remediate <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 6. Recent Quiz Sessions History */}
      <div className="card bg-base-100 shadow-sm border border-base-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-base-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-base-content flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Diagnostic Sessions
            </h3>
            <p className="text-xs text-base-content/60">
              Historical accuracy and pacing across recent quiz completions
            </p>
          </div>
        </div>

        {overview?.recentPerformanceTrend?.length === 0 ? (
          <div className="p-6 text-center text-xs text-base-content/60">
            No quiz sessions recorded yet. Launch a quiz to build historical analytics!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-xs">
              <thead>
                <tr className="border-b border-base-200 text-base-content/70">
                  <th>Session Date</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th>Session Latency</th>
                  <th>Telemetry Status</th>
                </tr>
              </thead>
              <tbody>
                {overview?.recentPerformanceTrend?.map((quiz, idx) => (
                  <tr key={idx} className="hover:bg-base-200/50">
                    <td className="font-medium">
                      {new Date(quiz.completedAt || Date.now()).toLocaleString()}
                    </td>
                    <td className="font-bold text-primary">
                      {quiz.score} / {quiz.totalQuestions}
                    </td>
                    <td className="font-bold">
                      <span className={quiz.accuracy >= 70 ? 'text-success' : 'text-warning'}>
                        {Math.round(quiz.accuracy)}%
                      </span>
                    </td>
                    <td className="font-mono">{quiz.totalTimeSeconds}s</td>
                    <td>
                      <span className="badge badge-success badge-xs gap-1 py-2">
                        <CheckCircle className="w-3 h-3" /> Ingested
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
