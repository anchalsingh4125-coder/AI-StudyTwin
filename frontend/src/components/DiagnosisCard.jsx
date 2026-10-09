import React, { useState } from 'react';
import { Bot, RefreshCw, AlertCircle, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import aiService from '../services/ai.service.js';

export default function DiagnosisCard({ diagnosis: initialDiagnosis, onDiagnosisUpdated }) {
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const updated = await aiService.diagnoseStudent();
      setDiagnosis(updated);
      if (onDiagnosisUpdated) onDiagnosisUpdated(updated);
    } catch (err) {
      setError(err.message || 'Failed to update AI diagnosis.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!diagnosis) {
    return (
      <div className="card bg-base-100 shadow-md border border-base-200 p-6 text-center space-y-4">
        <Bot className="w-10 h-10 text-primary mx-auto opacity-70" />
        <h4 className="font-bold text-base-content">AI Digital Twin Not Initialized</h4>
        <p className="text-xs text-base-content/60 max-w-sm mx-auto">
          Complete at least one quiz to allow the AI StudyTwin to calibrate and diagnose your learning state.
        </p>
      </div>
    );
  }

  const riskBadge = {
    high: 'badge-error text-error-content',
    medium: 'badge-warning text-warning-content',
    low: 'badge-success text-success-content',
  }[diagnosis.learningRisk] || 'badge-neutral';

  return (
    <div className="card bg-gradient-to-br from-base-100 to-base-200/50 shadow-md border border-primary/20 p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-base-content">AI StudyTwin Diagnosis</h3>
              <span className={`badge ${riskBadge} uppercase text-[10px] font-extrabold tracking-wider py-2`}>
                {diagnosis.learningRisk} Risk
              </span>
            </div>
            <p className="text-xs text-base-content/60">Grounded cognitive assessment powered by inference models</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-outline btn-xs btn-primary gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Analyzing...' : 'Re-diagnose'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error text-xs py-2">
          <span>{error}</span>
        </div>
      )}

      {/* Diagnosis Summary */}
      <div className="bg-base-100/90 rounded-xl p-4 border border-base-200">
        <p className="text-sm text-base-content leading-relaxed font-medium">
          "{diagnosis.diagnosisSummary}"
        </p>
      </div>

      {/* Topic Badges: Weak vs Strong */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weak Areas */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-error uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" />
            Vulnerable Topics ({diagnosis.weakTopics?.length || 0})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {diagnosis.weakTopics && diagnosis.weakTopics.length > 0 ? (
              diagnosis.weakTopics.map((w, i) => (
                <span key={i} className="badge badge-error badge-sm font-semibold">
                  {w}
                </span>
              ))
            ) : (
              <span className="text-xs text-base-content/50 italic">No critical weak spots detected.</span>
            )}
          </div>
        </div>

        {/* Strong Areas */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-success uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            Consolidated Strengths ({diagnosis.strongTopics?.length || 0})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {diagnosis.strongTopics && diagnosis.strongTopics.length > 0 ? (
              diagnosis.strongTopics.map((s, i) => (
                <span key={i} className="badge badge-success badge-sm font-semibold">
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-base-content/50 italic">Developing baseline mastery...</span>
            )}
          </div>
        </div>
      </div>

      {/* Repeated Error Patterns */}
      {diagnosis.repeatedErrorPatterns && diagnosis.repeatedErrorPatterns.length > 0 && (
        <div className="space-y-2 border-t border-base-300 pt-3">
          <span className="text-xs font-bold text-warning uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Observed Misconception Patterns
          </span>
          <div className="space-y-1">
            {diagnosis.repeatedErrorPatterns.map((p, i) => (
              <div key={i} className="text-xs text-base-content/80 flex items-start gap-2 bg-base-100 p-2 rounded-lg">
                <span className="text-warning font-bold">›</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Immediate Priorities */}
      {diagnosis.immediatePriorities && diagnosis.immediatePriorities.length > 0 && (
        <div className="space-y-2 border-t border-base-300 pt-3">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Immediate Next Steps</span>
          <div className="space-y-1.5">
            {diagnosis.immediatePriorities.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-base-content/90">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] shrink-0 font-bold">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
