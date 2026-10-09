import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

/**
 * Authentication middleware that verifies JWT from httpOnly cookie
 * and attaches the authenticated user document to req.user.
 */
export const authenticateUser = async (req, res, next) => {
  try {
    // Read JWT primarily from httpOnly cookie
    let token = req.cookies?.token;

    // Also support Authorization header Bearer token for API testing flexibility
    if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT_SECRET missing.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.',
      });
    }

    // Attach user to req.user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal error verifying authentication token.',
    });
  }
};

export default authenticateUser;
