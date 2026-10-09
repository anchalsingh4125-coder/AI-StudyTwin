import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT for a given user ID
 * @param {string} userId
 * @returns {string}
 */
export const signToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.sign({ userId }, secret, {
    expiresIn: '7d',
  });
};

/**
 * Standard cookie configuration for HTTP-only JWT storage
 * @returns {object}
 */
export const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true, // Prevents XSS script access
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  };
};
