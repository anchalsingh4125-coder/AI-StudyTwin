import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, UserPlus, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore.js';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetSubject, setTargetSubject] = useState('Data Structures & Algorithms');
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const result = await register({
      name,
      email,
      password,
      targetSubjects: [targetSubject],
    });
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div className="card-body p-8 space-y-4">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-base-content">Create Account</h2>
            <p className="text-xs text-base-content/60">Initialize your personalized AI Digital Twin</p>
          </div>

          {error && (
            <div className="alert alert-error text-xs py-2.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-xs uppercase tracking-wider">Full Name</span>
              </label>
              <input
                type="text"
                required
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered w-full text-sm"
              />
            </div>

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
                <span className="label-text font-bold text-xs uppercase tracking-wider">Password (Min 6 chars)</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full text-sm"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-xs uppercase tracking-wider">Primary Target Domain</span>
              </label>
              <select
                value={targetSubject}
                onChange={(e) => setTargetSubject(e.target.value)}
                className="select select-bordered w-full text-sm"
              >
                <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
                <option value="Operating Systems">Operating Systems</option>
                <option value="Computer Networks">Computer Networks</option>
                <option value="Database Management Systems">Database Management Systems</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full gap-2 font-bold mt-2"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isLoading ? 'Creating Profile...' : 'Register'}
            </button>
          </form>

          <div className="divider text-xs text-base-content/40">ALREADY HAVE AN ACCOUNT?</div>

          <div className="text-center">
            <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
              Sign in to your account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
