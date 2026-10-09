import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  BookOpen,
  Award,
  LogOut,
  Brain,
  BarChart3,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import useAuthStore from '../store/authStore.js';
import analyticsService from '../services/analytics.service.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getOverview();
        setAnalytics(data);
      } catch (err) {
        console.warn('Could not load student profile analytics:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return <LoadingSpinner message="Loading student profile details..." />;
  }

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Student';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 1. Header Banner Card */}
      <div className="card bg-base-100 shadow-sm border border-base-200 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-3xl w-24 h-24 text-3xl font-black shadow-lg">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-base-content">
                {user?.name || 'Student Name'}
              </h1>
              <span className="badge badge-primary badge-outline text-xs font-bold py-3 px-3">
                Digital Twin Active
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-base-content/70">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-primary" /> {user?.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-secondary" /> Enrolled {joinDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cognitive Twin Performance Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 text-center shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Readiness Score</div>
          <div className="stat-value text-2xl text-primary font-black mt-1">
            {analytics?.overallReadinessScore ?? 0}%
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">Cognitive index</div>
        </div>

        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 text-center shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Quizzes Evaluated</div>
          <div className="stat-value text-2xl text-secondary font-black mt-1">
            {analytics?.totalQuizzesCompleted || 0}
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">Sessions</div>
        </div>

        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 text-center shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Overall Accuracy</div>
          <div className="stat-value text-2xl text-accent font-black mt-1">
            {analytics?.overallAccuracy ? `${Math.round(analytics.overallAccuracy)}%` : '0%'}
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">Across attempts</div>
        </div>

        <div className="stat bg-base-100 rounded-2xl border border-base-200 p-4 text-center shadow-sm">
          <div className="stat-title text-xs font-semibold text-base-content/60">Avg Latency</div>
          <div className="stat-value text-2xl text-info font-black mt-1">
            {analytics?.averageQuestionTimeSeconds ? `${analytics.averageQuestionTimeSeconds}s` : '0s'}
          </div>
          <div className="stat-desc text-[11px] text-base-content/50">Per question</div>
        </div>
      </div>

      {/* 3. Target Subjects & Focus Disciplines */}
      <div className="card bg-base-100 shadow-sm border border-base-200 p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2 border-b border-base-200 pb-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-base-content">Target Learning Focus</h2>
        </div>

        <p className="text-xs text-base-content/60">
          Curriculum disciplines tracked for cognitive modeling and difficulty pacing:
        </p>

        <div className="flex flex-wrap gap-2">
          {user?.targetSubjects && user.targetSubjects.length > 0 ? (
            user.targetSubjects.map((subj, idx) => (
              <span key={idx} className="badge badge-primary badge-lg font-bold py-4 px-4 text-xs">
                {subj}
              </span>
            ))
          ) : (
            <div className="space-y-1">
              <span className="badge badge-neutral badge-lg py-4 px-4 text-xs font-medium">
                Operating Systems
              </span>
              <span className="badge badge-neutral badge-lg py-4 px-4 text-xs font-medium ml-2">
                Computer Networks
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Quick Actions & Session Management */}
      <div className="card bg-base-100 shadow-sm border border-base-200 p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-2 border-b border-base-200 pb-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-base-content">Study Actions & Session</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/quiz')}
            className="btn btn-outline btn-primary flex flex-col items-center justify-center h-24 gap-2"
          >
            <Brain className="w-5 h-5" />
            <span className="font-bold text-xs">Launch Quiz</span>
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className="btn btn-outline btn-secondary flex flex-col items-center justify-center h-24 gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="font-bold text-xs">View Analytics</span>
          </button>

          <button
            onClick={() => navigate('/recommendations')}
            className="btn btn-outline btn-accent flex flex-col items-center justify-center h-24 gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-bold text-xs">AI Study Plan</span>
          </button>
        </div>

        <div className="pt-4 border-t border-base-200 flex justify-end">
          <button
            onClick={handleLogout}
            className="btn btn-error btn-outline btn-sm gap-2 font-bold"
          >
            <LogOut className="w-4 h-4" /> End Session (Logout)
          </button>
        </div>
      </div>
    </div>
  );
}
