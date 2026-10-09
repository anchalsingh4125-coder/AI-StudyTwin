import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, LogIn, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const result = await login({ email, password });
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div className="card-body p-8 space-y-4">
          {/* Logo & Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-base-content">Welcome Back</h2>
            <p className="text-xs text-base-content/60">Log in to consult your personal AI StudyTwin</p>
          </div>

          {error && (
            <div className="alert alert-error text-xs py-2.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-xs uppercase tracking-wider">Email Address</span>
              </label>
              <input
                type="email"
                required
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered w-full text-sm"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-xs uppercase tracking-wider">Password</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full gap-2 font-bold mt-2"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="divider text-xs text-base-content/40">NEW TO STUDYTWIN?</div>

          <div className="text-center">
            <Link to="/register" className="text-sm font-semibold text-primary hover:underline">
              Create a free student account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
