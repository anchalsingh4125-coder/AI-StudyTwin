import User from '../models/user.model.js';
import { signToken, getCookieOptions } from '../utils/jwt.js';

/**
 * @desc    Register a new student user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, targetSubjects } = req.body;

    // Basic payload validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Create user record
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      targetSubjects: Array.isArray(targetSubjects) ? targetSubjects : [],
    });

    // Generate JWT and set httpOnly cookie
    const token = signToken(user._id);
    res.cookie('token', token, getCookieOptions());

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('[Register Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal error creating user account.',
    });
  }
};

/**
 * @desc    Log in an existing user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Retrieve user including password hash
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Verify password hash
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT and set httpOnly cookie
    const token = signToken(user._id);
    res.cookie('token', token, getCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('[Login Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal error processing login.',
    });
  }
};

/**
 * @desc    Get currently authenticated user details
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error('[GetMe Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal error fetching user profile.',
    });
  }
};

/**
 * @desc    Log out user & clear httpOnly authentication cookie
 * @route   POST /api/v1/auth/logout
 * @access  Public / Private
 */
export const logout = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('[Logout Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal error during logout.',
    });
  }
};
