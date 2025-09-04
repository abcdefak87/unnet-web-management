const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Password validation function
const validatePassword = (password) => {
  const minLength = parseInt(process.env.MIN_PASSWORD_LENGTH) || 8;
  const requireComplexity = process.env.REQUIRE_PASSWORD_COMPLEXITY === 'true';
  
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters long`;
  }
  
  if (requireComplexity) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }
  }
  
  return null;
};

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').custom((value) => {
    const error = validatePassword(value);
    if (error) throw new Error(error);
    return true;
  }),
  body('name').isLength({ min: 2 }).trim(),
  body('role').isIn(['superadmin', 'admin', 'gudang', 'user']).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role = 'admin' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login
router.post('/login', [
  body('username').notEmpty().trim(), // This is actually email in the frontend
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find user by email (frontend sends email as 'username' parameter)
    const user = await prisma.user.findFirst({
      where: {
        email: username,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token with shorter expiration
    const token = jwt.sign(
      { userId: user.id, role: user.role, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Reduced from 24h to 15 minutes
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    // Store refresh token in database (optional - for token revocation)
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLogin: new Date(),
        // Store refresh token hash for security
        refreshTokenHash: await bcrypt.hash(refreshToken, 10)
      }
    });

    res.json({
      message: 'Login successful',
      token,
      refreshToken,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.put('/profile', authenticateToken, [
  body('name').isLength({ min: 2 }).trim().optional(),
  body('email').isEmail().normalizeEmail().optional(),
  body('currentPassword').optional(),
  body('newPassword').custom((value) => {
    if (value) {
      const error = validatePassword(value);
      if (error) throw new Error(error);
    }
    return true;
  }).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, currentPassword, newPassword } = req.body;
    const updateData = {};

    // Handle basic profile updates
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    // Handle password change if provided
    if (newPassword && currentPassword) {
      // Get user with password to verify current password
      const userWithPassword = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, userWithPassword.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      updateData.password = hashedNewPassword;
    } else if (newPassword && !currentPassword) {
      return res.status(400).json({ error: 'Current password is required to change password' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').custom((value) => {
    const error = validatePassword(value);
    if (error) throw new Error(error);
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Get user and verify refresh token hash
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        refreshTokenHash: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Verify refresh token hash (optional security check)
    if (user.refreshTokenHash) {
      const isValidRefreshToken = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isValidRefreshToken) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
    }

    // Generate new access token
    const newToken = jwt.sign(
      { userId: user.id, role: user.role, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout endpoint (revoke refresh token)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Clear refresh token hash from database
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshTokenHash: null }
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
