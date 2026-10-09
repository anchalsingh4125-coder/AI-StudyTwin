import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  RefreshCw,
  Clock,
  History,
  CheckCircle2,
  AlertTriangle,
  Brain,
  ArrowRight,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import aiService from '../services/ai.service.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import RecommendationCard from '../components/RecommendationCard.jsx';

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [activePlan, setActivePlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const [recs, hist] = await Promise.all([
        aiService.getRecommendations(),
        aiService.getRecommendationHistory().catch(() => []),
      ]);

      setActivePlan(recs);
      setHistory(hist || []);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setError('Unable to load recommendations. Please verify the AI microservice and backend are running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleGenerateFresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const freshPlan = await aiService.generateFreshRecommendations();
      setActivePlan(freshPlan);

      // Refresh history as well
      const updatedHist = await aiService.getRecommendationHistory().catch(() => []);
      setHistory(updatedHist);
    } catch (err) {
      console.error('Failed to regenerate recommendations:', err);
      setError('Failed to regenerate recommendations from AI engine.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Consulting AI StudyTwin recommendation engine..." />;
  }

  const actionItems = activePlan?.actionItems || [];
  const weakTopics = activePlan?.weakTopics || [];
  const strongTopics = activePlan?.strongTopics || [];

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-black text-base-content">AI Personalized Study Plan</h1>
          </div>
          <p className="text-xs md:text-sm text-base-content/70">
            Tailored pedagogical interventions dynamically calibrated to your weak topics and mistake tendencies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateFresh}
            disabled={isRefreshing}
            className="btn btn-primary btn-sm gap-2 font-bold shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Re-analyzing...' : 'Regenerate Plan'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning text-xs py-3">
          <span>{error}</span>
        </div>
      )}

      {/* 2. Active Diagnostic Summary Card */}
      {activePlan && (
        <div className="card bg-gradient-to-br from-base-100 to-base-200 shadow-sm border border-base-200 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-base-200 pb-5">
            <div className="space-y-2">
              <span className="badge badge-primary badge-outline text-xs font-bold uppercase tracking-wider">
                Current Diagnostic Evaluation
              </span>
              <h2 className="text-xl font-bold text-base-content">
                {activePlan.diagnosisSummary || 'Telemetry-driven performance assessment'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-base-content/60">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Generated {new Date(activePlan.createdAt || Date.now()).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="badge badge-neutral text-xs font-semibold py-3 px-3">
                {actionItems.length} Action Items
              </span>
            </div>
          </div>

          {/* Weak vs Strong Topic Pill Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-base-100 p-4 rounded-xl border border-error/20 space-y-2">
              <span className="text-xs font-bold text-error uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Focus Areas (Weak Topics)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {weakTopics.length > 0 ? (
                  weakTopics.map((topic, i) => (
                    <span key={i} className="badge badge-error badge-outline text-xs font-semibold">
                      {topic}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-base-content/50">None flagged as weak currently</span>
                )}
              </div>
            </div>

            <div className="bg-base-100 p-4 rounded-xl border border-success/20 space-y-2">
              <span className="text-xs font-bold text-success uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Strengths (Solid Retention)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {strongTopics.length > 0 ? (
                  strongTopics.map((topic, i) => (
                    <span key={i} className="badge badge-success badge-outline text-xs font-semibold">
                      {topic}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-base-content/50">Keep practicing to establish verified strengths</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Action Items Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-base-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Prioritized Action Steps
            </h3>
            <p className="text-xs text-base-content/60">
              Ordered by urgency (High priority items directly target critical misconception vulnerabilities)
            </p>
          </div>
        </div>

        {actionItems.length === 0 ? (
          <div className="card bg-base-100 p-10 border border-base-200 text-center space-y-3">
            <Brain className="w-10 h-10 text-primary mx-auto opacity-60" />
            <h4 className="font-bold text-base text-base-content">No Active Recommendations</h4>
            <p className="text-xs text-base-content/60 max-w-sm mx-auto">
              Solve quizzes to give your AI StudyTwin the telemetry it needs to formulate tailored steps.
            </p>
            <button onClick={() => navigate('/quiz')} className="btn btn-primary btn-sm mx-auto gap-2">
              <Brain className="w-4 h-4" /> Go to Quiz Center
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

      {/* 4. Recommendation History Timeline */}
      <div className="card bg-base-100 shadow-sm border border-base-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-base-200 pb-3">
          <History className="w-5 h-5 text-secondary" />
          <div>
            <h3 className="text-base font-bold text-base-content">Recommendation Snapshot Archive</h3>
            <p className="text-xs text-base-content/60">
              Audit trail of previous AI diagnoses and how recommendations evolved
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-base-content/50 p-4 text-center">
            No historical recommendation snapshots available yet.
          </p>
        ) : (
          <div className="space-y-3">
            {history.map((snapshot) => {
              const isExpanded = expandedHistoryId === snapshot._id;
              return (
                <div
                  key={snapshot._id}
                  className="border border-base-200 rounded-xl overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setExpandedHistoryId(isExpanded ? null : snapshot._id)}
                    className="p-4 bg-base-100 hover:bg-base-200/50 cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-base-content">
                          {new Date(snapshot.createdAt).toLocaleDateString()} at{' '}
                          {new Date(snapshot.createdAt).toLocaleTimeString()}
                        </span>
                        <span className="badge badge-ghost badge-xs">
                          {snapshot.actionItems?.length || 0} actions
                        </span>
                      </div>
                      <p className="text-xs text-base-content/70 line-clamp-1">
                        {snapshot.diagnosisSummary}
                      </p>
                    </div>

                    <button className="btn btn-ghost btn-xs btn-circle">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-base-200/30 border-t border-base-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-bold text-error">Weak: </span>
                          <span>{snapshot.weakTopics?.join(', ') || 'None'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-success">Strong: </span>
                          <span>{snapshot.strongTopics?.join(', ') || 'None'}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-bold text-base-content/60 uppercase">
                          Action Items Generated:
                        </span>
                        {snapshot.actionItems?.map((act, aIdx) => (
                          <div
                            key={aIdx}
                            className="p-2.5 bg-base-100 rounded-lg border border-base-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-base-content">
                                {act.recommendedAction}
                              </span>
                              <span className="badge badge-outline badge-xs uppercase">
                                {act.priority}
                              </span>
                            </div>
                            <p className="text-[11px] text-base-content/70">{act.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
