import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Brain,
  Timer,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import curriculumService from '../services/curriculum.service.js';
import quizService from '../services/quiz.service.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function QuizPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Setup state
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState(searchParams.get('topicId') || '');
  const [difficulty, setDifficulty] = useState('all');
  const [questionCount, setQuestionCount] = useState(5);
  const [isStarting, setIsStarting] = useState(false);
  const [setupError, setSetupError] = useState(null);

  // Active quiz runner state
  const [activeQuiz, setActiveQuiz] = useState(null); // { quizId, totalQuestions, questions: [...] }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [questionId]: optionIndex }
  const [questionTimeSeconds, setQuestionTimeSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Per-question timer
  const timerRef = useRef(null);

  // Load curriculum metadata on mount
  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        const subjs = await curriculumService.getSubjects();
        setSubjects(subjs);
        if (subjs.length > 0) {
          const firstSubjId = subjs[0]._id;
          setSelectedSubjectId(firstSubjId);
          const topList = await curriculumService.getTopicsBySubject(firstSubjId);
          setTopics(topList);
        }
      } catch (err) {
        console.error('Failed to load curriculum options:', err);
      }
    };
    loadCurriculum();
  }, []);

  // Update topics when selected subject changes
  const handleSubjectChange = async (subjId) => {
    setSelectedSubjectId(subjId);
    setSelectedTopicId('');
    try {
      const topList = await curriculumService.getTopicsBySubject(subjId);
      setTopics(topList);
    } catch (err) {
      console.error('Failed to update topics:', err);
    }
  };

  // Auto-launch quiz if topicId parameter was passed from a RecommendationCard CTA
  useEffect(() => {
    const urlTopicId = searchParams.get('topicId');
    if (urlTopicId && !activeQuiz && !isStarting) {
      setSelectedTopicId(urlTopicId);
      startQuizSession({ topicId: urlTopicId, numberOfQuestions: 5 });
    }
  }, [searchParams]);

  // Stopwatch for active question
  useEffect(() => {
    if (activeQuiz) {
      setQuestionTimeSeconds(0);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setQuestionTimeSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [currentIndex, activeQuiz]);

  const startQuizSession = async (overrides = {}) => {
    try {
      setIsStarting(true);
      setSetupError(null);

      const payload = {
        subjectId: overrides.subjectId || selectedSubjectId || undefined,
        topicId: overrides.topicId || selectedTopicId || undefined,
        difficulty: overrides.difficulty || difficulty,
        numberOfQuestions: overrides.numberOfQuestions || questionCount,
      };

      const data = await quizService.startQuiz(payload);
      setActiveQuiz(data);
      setCurrentIndex(0);
      setSelectedAnswers({});
    } catch (err) {
      setSetupError(err.message || 'Failed to start quiz session.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSelectOption = async (optionIndex) => {
    if (!activeQuiz) return;
    const currentQuestion = activeQuiz.questions[currentIndex];
    const qId = currentQuestion._id;

    // Optimistically update selection
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optionIndex }));

    // Send answer telemetry to backend
    try {
      await quizService.answerQuestion(activeQuiz.quizId, {
        questionId: qId,
        selectedOption: optionIndex,
        timeSpentSeconds: questionTimeSeconds,
      });
    } catch (err) {
      console.warn('Failed to record answer telemetry:', err.message);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || isSubmitting) return;
    const confirmSubmit = window.confirm('Are you ready to submit your quiz for telemetry analysis?');
    if (!confirmSubmit) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      clearInterval(timerRef.current);

      await quizService.submitQuiz(activeQuiz.quizId);
      navigate(`/quiz/${activeQuiz.quizId}/result`);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit quiz.');
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // VIEW A: QUIZ LAUNCH & CONFIGURATION VIEW
  // ========================================================
  if (!activeQuiz) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-1">
            <Brain className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-base-content">Quiz & Telemetry Center</h2>
          <p className="text-xs text-base-content/60 max-w-md mx-auto">
            Choose a subject or specific topic. Every answer, latency, and mistake pattern directly feeds your AI StudyTwin.
          </p>
        </div>

        {setupError && (
          <div className="alert alert-error text-xs py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{setupError}</span>
          </div>
        )}

        <div className="card bg-base-100 shadow-md border border-base-200 p-6 md:p-8 space-y-5">
          {/* Subject Selector */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" /> Select Subject
              </span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="select select-bordered w-full text-sm font-medium"
            >
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Selector */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold text-xs uppercase tracking-wider">
                Select Specific Topic (Optional)
              </span>
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="select select-bordered w-full text-sm font-medium"
            >
              <option value="">All Topics under this Subject</option>
              {topics.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Difficulty Filter */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-xs uppercase tracking-wider">Difficulty Filter</span>
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="select select-bordered w-full text-sm font-medium"
              >
                <option value="all">Mixed (All Difficulties)</option>
                <option value="easy">Easy (Foundational)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="hard">Hard (Advanced Challenge)</option>
              </select>
            </div>

            {/* Question Count */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-xs uppercase tracking-wider">Number of Questions</span>
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="select select-bordered w-full text-sm font-medium"
              >
                <option value={3}>3 Questions (Quick Drill)</option>
                <option value={5}>5 Questions (Standard)</option>
                <option value={10}>10 Questions (Comprehensive Diagnostic)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => startQuizSession()}
            disabled={isStarting}
            className="btn btn-primary w-full gap-2 font-bold shadow-md text-base mt-2"
          >
            {isStarting ? <span className="loading loading-spinner loading-sm"></span> : <Brain className="w-5 h-5" />}
            {isStarting ? 'Preparing Diagnostic Set...' : 'Launch Quiz'}
          </button>
        </div>
      </div>
    );
  }

  // ========================================================
  // VIEW B: ACTIVE QUIZ RUNNER INTERFACE
  // ========================================================
  const currentQuestion = activeQuiz.questions[currentIndex];
  const totalQuestions = activeQuiz.questions.length;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  const selectedOption = selectedAnswers[currentQuestion._id];

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Top Header: Progress & Timer */}
      <div className="card bg-base-100 shadow-sm border border-base-200 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-base-content/70">
          <div className="flex items-center gap-2">
            <span className="badge badge-primary badge-sm font-bold">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="badge badge-outline badge-sm uppercase text-[10px]">
              {currentQuestion.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-base-200 px-3 py-1 rounded-full font-mono text-xs">
            <Timer className="w-3.5 h-3.5 text-primary" />
            <span>{questionTimeSeconds}s</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-base-200 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {submitError && (
        <div className="alert alert-error text-xs py-2">
          <span>{submitError}</span>
        </div>
      )}

      {/* Question Card */}
      <div className="card bg-base-100 shadow-md border border-base-200 p-6 md:p-8 space-y-6">
        <h3 className="text-lg md:text-xl font-bold text-base-content leading-relaxed">
          {currentQuestion.questionText}
        </h3>

        {/* Options List */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(idx)}
                className={`w-full p-4 rounded-xl text-left border-2 transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                    : 'border-base-200 hover:border-base-300 bg-base-100 text-base-content'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isSelected
                        ? 'bg-primary text-primary-content'
                        : 'bg-base-200 text-base-content/70'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm font-medium">{option}</span>
                </div>

                {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-base-200">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="btn btn-ghost btn-sm gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          {currentIndex < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              className="btn btn-primary btn-sm gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmitQuiz}
              disabled={isSubmitting}
              className="btn btn-success btn-sm gap-2 font-bold text-success-content shadow-sm"
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSubmitting ? 'Evaluating...' : 'Submit Quiz'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
