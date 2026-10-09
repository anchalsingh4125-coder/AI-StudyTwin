import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, HelpCircle, ArrowRight } from 'lucide-react';

export default function RecommendationCard({ item }) {
  const navigate = useNavigate();

  const priorityMeta = {
    high: { badge: 'badge-error text-error-content', label: 'HIGH PRIORITY' },
    medium: { badge: 'badge-warning text-warning-content', label: 'MEDIUM PRIORITY' },
    low: { badge: 'badge-info text-info-content', label: 'LOW PRIORITY' },
  }[item.priority] || { badge: 'badge-neutral', label: 'ACTION' };

  const handleStartPractice = () => {
    navigate(`/quiz?topicId=${item.topicId}`);
  };

  return (
    <div className="card bg-base-100 shadow-md border border-base-200 hover:border-primary/50 transition-all p-5 flex flex-col justify-between space-y-4">
      {/* Top Meta */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className={`badge ${priorityMeta.badge} text-[10px] font-extrabold tracking-wider py-2`}>
            {priorityMeta.label}
          </span>
          <span className="text-xs font-semibold text-primary truncate max-w-[150px]">
            {item.topicName}
          </span>
        </div>

        {/* Action Title */}
        <h4 className="font-bold text-base text-base-content leading-snug">
          {item.recommendedAction}
        </h4>

        {/* Rationale */}
        <div className="bg-base-200/60 rounded-lg p-3 text-xs text-base-content/80 space-y-1">
          <span className="font-bold text-base-content/60 uppercase tracking-wider block text-[10px]">
            Why this matters:
          </span>
          <p className="leading-relaxed">{item.rationale}</p>
        </div>
      </div>

      {/* Footer Metrics & Action CTA */}
      <div className="pt-2 border-t border-base-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-base-content/60 font-medium">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {item.estimatedMinutes}m
          </span>
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            {item.practiceQuestionCount} questions
          </span>
        </div>

        <button
          onClick={handleStartPractice}
          className="btn btn-primary btn-sm gap-1.5 font-bold shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Start Practice
        </button>
      </div>
    </div>
  );
}
