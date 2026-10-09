/**
 * Configurable thresholds for student topic mastery classification.
 */
export const MASTERY_THRESHOLDS = {
  WEAK: { min: 0, max: 39, label: 'Weak' },
  DEVELOPING: { min: 40, max: 69, label: 'Developing' },
  STRONG: { min: 70, max: 84, label: 'Strong' },
  MASTERED: { min: 85, max: 100, label: 'Mastered' },
};

/**
 * Classify a mastery score (0-100) into a pedagogical tier.
 * @param {number} score
 * @returns {'weak' | 'developing' | 'strong' | 'mastered'}
 */
export const classifyMastery = (score) => {
  const rounded = Math.round(score);
  if (rounded >= MASTERY_THRESHOLDS.MASTERED.min) return 'mastered';
  if (rounded >= MASTERY_THRESHOLDS.STRONG.min) return 'strong';
  if (rounded >= MASTERY_THRESHOLDS.DEVELOPING.min) return 'developing';
  return 'weak';
};

/**
 * Weights for difficulty levels in mastery calculation
 */
export const DIFFICULTY_WEIGHTS = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

/**
 * Mastery formula parameter defaults
 */
export const MASTERY_FORMULA_CONFIG = {
  minConfidenceAttempts: 5, // Number of attempts required for 100% confidence weight
  neutralPriorScore: 40,    // Default prior anchor for topics with very low attempt counts
  recencyWeightDecay: 0.2,  // Multiplier bonus for more recent attempts
  timeIdealThresholds: {
    fastWithAccuracy: 45,   // <= 45s with high accuracy awards speed bonus
    strugglingTime: 90,     // >= 90s incurs time penalty
  },
  mistakePenalties: {
    conceptual: 3.0,        // Points deducted per repeated conceptual mistake
    careless: 1.5,          // Points deducted per repeated careless mistake
    maxPenalty: 15.0,       // Max total penalty deduction
  },
};
