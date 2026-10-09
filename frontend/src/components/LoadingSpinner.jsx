import React from 'react';

export default function LoadingSpinner({ message = 'Loading AI StudyTwin...' }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
      <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
      <p className="text-base text-base-content/70 font-medium">{message}</p>
    </div>
  );
}
