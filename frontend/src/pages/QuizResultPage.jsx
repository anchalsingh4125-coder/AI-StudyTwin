import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Brain,
  RotateCcw,
} from 'lucide-react';
import quizService from '../services/quiz.service.js';
import aiService from '../services/ai.service.js';
import RecommendationCard from '../components/RecommendationCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function QuizResultPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await quizService.getQuizResult(quizId);
        setResultData(data);

        // Fetch fresh recommendation next steps
        try {
          const recs = await aiService.getRecommendations();
          setRecommendations(recs);
        } catch (rErr) {
          console.warn('Could not load next steps recommendations:', rErr.message);
        }
      } catch (err) {
        console.error('Failed to load quiz results:', err);
        setError(err.message || 'Unable to retrieve quiz results.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [quizId]);

  if (loading) {
    return <LoadingSpinner message="Calculating telemetry and updating your Digital Twin..." />;
  }

  if (error || !resultData) {
    return (
      <div className="card bg-base-100 p-8 border border-base-200 text-center max-w-lg mx-auto space-y-4 my-8">
        <XCircle className="w-12 h-12 text-error mx-auto" />
        <h3 className="font-bold text-lg text-base-content">Result Not Found</h3>
        <p className="text-xs text-base-content/60">{error}</p>
        <button onClick={() => navigate('/quiz')} className="btn btn-primary btn-sm mx-auto">
          Return to Quiz Center
        </button>
      </div>
    );
  }

  const { quiz, attempts = [] } = resultData;
  const actionItems = recommendations?.actionItems || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* 1. Header & Summary Card */}
      <div className="card bg-base-100 shadow-md border border-base-200 p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-base-200 pb-6 text-center md:text-left">
          <div className="space-y-1">
            <span className="badge badge-primary badge-sm font-bold uppercase tracking-wider mb-1">
              Assessment Evaluated
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-base-content">Quiz Performance Telemetry</h2>
            <p className="text-xs text-base-content/60">
              Completed on {new Date(quiz.completedAt || Date.now()).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/quiz')} className="btn btn-primary btn-sm gap-1.5 font-bold">
              <RotateCcw className="w-4 h-4" /> Take Another Quiz
            </button>
            <Link to="/" className="btn btn-outline btn-sm">
              Dashboard
            </Link>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-base-200/50 p-4 rounded-2xl text-center space-y-1 border border-base-200">
            <span className="text-xs font-semibold text-base-content/60 uppercase">Score</span>
            <p className="text-3xl font-black text-primary">
              {quiz.score} / {quiz.totalQuestions}
            </p>
          </div>

          <div className="bg-base-200/50 p-4 rounded-2xl text-center space-y-1 border border-base-200">
            <span className="text-xs font-semibold text-base-content/60 uppercase">Accuracy</span>
            <p className="text-3xl font-black text-secondary">{Math.round(quiz.accuracy)}%</p>
          </div>

          <div className="bg-base-200/50 p-4 rounded-2xl text-center space-y-1 border border-base-200">
            <span className="text-xs font-semibold text-base-content/60 uppercase">Total Time</span>
            <p className="text-3xl font-black text-accent">{quiz.totalTimeSeconds}s</p>
          </div>

          <div className="bg-base-200/50 p-4 rounded-2xl text-center space-y-1 border border-base-200">
            <span className="text-xs font-semibold text-base-content/60 uppercase">Correct / Errors</span>
            <p className="text-2xl font-black text-base-content">
              <span className="text-success">{quiz.correctAnswers}</span> /{' '}
              <span className="text-error">{quiz.incorrectAnswers}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Recommended Next Steps (Direct Adaptive Actions) */}
      {actionItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-base-200 pb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-base-content">Recommended Next Steps</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actionItems.slice(0, 2).map((item, idx) => (
              <RecommendationCard key={idx} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* 3. Detailed Question-by-Question Review */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-base-content">Question-by-Question Diagnostic Review</h3>

        <div className="space-y-4">
          {attempts.map((att, index) => {
            const isCorrect = att.isCorrect;
            return (
              <div
                key={index}
                className={`card bg-base-100 shadow-sm border-2 p-6 space-y-4 ${
                  isCorrect ? 'border-success/30' : 'border-error/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        isCorrect ? 'bg-success text-success-content' : 'bg-error text-error-content'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-base-content/60 uppercase">
                      {att.topicName} · {att.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {att.mistakeType && att.mistakeType !== 'none' && (
                      <span className="badge badge-error badge-xs uppercase font-bold py-2">
                        {att.mistakeType}
                      </span>
                    )}
                    <span className="text-xs text-base-content/50 font-mono">{att.timeSpentSeconds}s</span>
                  </div>
                </div>

                {/* Question Text */}
                <p className="font-semibold text-base text-base-content">{att.questionText}</p>

                {/* Options List */}
                <div className="space-y-2">
                  {att.options?.map((opt, optIdx) => {
                    const isSelected = att.selectedOption === optIdx;
                    const isTheCorrectOption = att.correctOption === optIdx;

                    let optionStyle = 'border-base-200 bg-base-100 text-base-content';
                    if (isTheCorrectOption) {
                      optionStyle = 'border-success bg-success/10 text-success font-bold';
                    } else if (isSelected && !isCorrect) {
                      optionStyle = 'border-error bg-error/10 text-error line-through';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-xl border text-sm flex items-center justify-between ${optionStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold bg-base-200 text-base-content/70">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {isTheCorrectOption && (
                          <span className="text-xs font-bold text-success flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Correct Answer
                          </span>
                        )}
                        {isSelected && !isTheCorrectOption && (
                          <span className="text-xs font-bold text-error flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Your Selection
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {att.explanation && (
                  <div className="bg-base-200/60 p-3 rounded-xl text-xs text-base-content/80 space-y-1">
                    <span className="font-bold text-primary block">Conceptual Rationale:</span>
                    <p className="leading-relaxed">{att.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
