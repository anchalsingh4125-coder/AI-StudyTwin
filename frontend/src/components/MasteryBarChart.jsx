import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ChevronRight, Play } from 'lucide-react';

export default function MasteryBarChart({ topics = [], onSelectTopic }) {
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const getTierMeta = (score) => {
    if (score >= 85) return { label: 'Mastered', badge: 'badge-success', color: 'bg-success' };
    if (score >= 70) return { label: 'Strong', badge: 'badge-primary', color: 'bg-primary' };
    if (score >= 40) return { label: 'Developing', badge: 'badge-warning', color: 'bg-warning' };
    return { label: 'Weak', badge: 'badge-error', color: 'bg-error' };
  };

  const filteredTopics = topics.filter((t) => {
    const tier = t.tier || getTierMeta(t.masteryScore).label.toLowerCase();
    if (filter === 'all') return true;
    return tier === filter;
  });

  return (
    <div className="card bg-base-100 shadow-md border border-base-200 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-base-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Topic Mastery Matrix
          </h3>
          <p className="text-xs text-base-content/60">Multidimensional proficiency breakdown across curriculum topics</p>
        </div>

        {/* Filter Pills */}
        <div className="join join-horizontal text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`join-item btn btn-xs ${filter === 'all' ? 'btn-neutral' : 'btn-ghost'}`}
          >
            All ({topics.length})
          </button>
          <button
            onClick={() => setFilter('weak')}
            className={`join-item btn btn-xs text-error ${filter === 'weak' ? 'btn-neutral' : 'btn-ghost'}`}
          >
            Weak
          </button>
          <button
            onClick={() => setFilter('developing')}
            className={`join-item btn btn-xs text-warning ${filter === 'developing' ? 'btn-neutral' : 'btn-ghost'}`}
          >
            Developing
          </button>
          <button
            onClick={() => setFilter('strong')}
            className={`join-item btn btn-xs text-primary ${filter === 'strong' ? 'btn-neutral' : 'btn-ghost'}`}
          >
            Strong
          </button>
        </div>
      </div>

      {filteredTopics.length === 0 ? (
        <div className="py-8 text-center text-sm text-base-content/60">
          No topics in this category yet. Complete diagnostic quizzes to calibrate mastery metrics.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTopics.map((topic) => {
            const meta = getTierMeta(topic.masteryScore);
            return (
              <div
                key={topic.topicId}
                className="group p-3 rounded-xl border border-base-200 hover:border-primary/40 hover:bg-base-200/40 transition-all cursor-pointer"
                onClick={() => (onSelectTopic ? onSelectTopic(topic) : navigate(`/quiz?topicId=${topic.topicId}`))}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-sm text-base-content truncate group-hover:text-primary transition-colors">
                      {topic.topicName}
                    </span>
                    <span className={`badge ${meta.badge} badge-xs uppercase font-semibold text-[10px]`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-base-content/60 hidden sm:inline">
                      Acc: {Math.round(topic.accuracy)}% · {topic.attemptsCount} attempts
                    </span>
                    <span className="font-mono font-bold text-sm text-base-content">{Math.round(topic.masteryScore)}%</span>
                    <button
                      className="btn btn-circle btn-ghost btn-xs text-primary group-hover:bg-primary group-hover:text-primary-content transition-colors"
                      title="Practice this topic"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Progress Bar */}
                <div className="w-full bg-base-300 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${meta.color} h-2 rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(100, Math.max(2, topic.masteryScore))}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
