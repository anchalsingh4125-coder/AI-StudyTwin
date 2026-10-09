import React from 'react';
import { Award, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function ReadinessRing({ score = 0 }) {
  const roundedScore = Math.round(score);

  let tier = 'Weak';
  let badgeClass = 'badge-error';
  let strokeColor = '#f87272'; // rose/red
  let Icon = AlertTriangle;
  let description = 'Critical foundational gaps require immediate review';

  if (roundedScore >= 85) {
    tier = 'Mastered';
    badgeClass = 'badge-success text-success-content';
    strokeColor = '#36d399'; // emerald
    Icon = Award;
    description = 'High conceptual retention across curriculum difficulty levels';
  } else if (roundedScore >= 70) {
    tier = 'Strong';
    badgeClass = 'badge-primary text-primary-content';
    strokeColor = '#570df8'; // blue/indigo
    Icon = ShieldCheck;
    description = 'Consistent accuracy; ready for timed speed drills and challenge sets';
  } else if (roundedScore >= 40) {
    tier = 'Developing';
    badgeClass = 'badge-warning text-warning-content';
    strokeColor = '#fbbd23'; // amber
    Icon = Zap;
    description = 'Foundations in place; focused problem-solving will bridge mastery';
  }

  // SVG circular gauge calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, roundedScore)) / 100) * circumference;

  return (
    <div className="card bg-base-100 shadow-md border border-base-200 p-6 flex flex-col md:flex-row items-center gap-6">
      {/* Circular Gauge */}
      <div className="relative flex items-center justify-center">
        <svg className="w-40 h-40 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            className="text-base-200"
            fill="transparent"
          />
          {/* Active progress arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={strokeColor}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-base-content">{roundedScore}%</span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-base-content/60">Readiness</span>
        </div>
      </div>

      {/* Status Details */}
      <div className="flex-1 text-center md:text-left space-y-2">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
          <h3 className="text-xl font-bold text-base-content">Cognitive Readiness</h3>
          <span className={`badge ${badgeClass} font-semibold uppercase text-xs tracking-wider gap-1 py-3 px-3`}>
            <Icon className="w-3.5 h-3.5" />
            {tier}
          </span>
        </div>
        <p className="text-sm text-base-content/70 leading-relaxed">{description}</p>
        <div className="pt-2 flex flex-wrap gap-4 text-xs text-base-content/60 justify-center md:justify-start">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-error"></span> 0-39% Weak</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning"></span> 40-69% Developing</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary"></span> 70-84% Strong</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success"></span> 85-100% Mastered</span>
        </div>
      </div>
    </div>
  );
}
