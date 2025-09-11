/**
 * JWT Token Manager
 * Fixes: Token expiration mismatch, refresh token rotation, token invalidation
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class TokenManager {
  constructor() {
    this.blacklistedTokens = new Set();
    this.refreshTokenStore = new Map();
    
    // Clean up expired tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 3600000);
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    return jwt.sign(
      {
        ...payload,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomBytes(16).toString('hex') // Unique token ID
      },
      secret,
      {
        expiresIn: '15m', // Short-lived access token
        issuer: 'isp-management',
        audience: 'isp-client'
      }
    );
  }

  /**
   * Generate refresh token with rotation
   */
  generateRefreshToken(userId) {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET not configured');
    }

    const tokenId = crypto.randomBytes(32).toString('hex');
    const refreshToken = jwt.sign(
      {
        userId,
        type: 'refresh',
        tokenId,
        iat: Math.floor(Date.now() / 1000)
      },
      secret,
      {
        expiresIn: '7d', // Long-lived refresh token
        issuer: 'isp-management',
        audience: 'isp-client'
      }
    );

    // Store refresh token metadata for rotation
    this.refreshTokenStore.set(tokenId, {
      userId,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      rotationCount: 0
    });

    return { refreshToken, tokenId };
  }

  /**
   * Verify and decode token
   */
  verifyToken(token, type = 'access') {
    try {
      const secret = type === 'refresh' 
        ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
        : process.env.JWT_SECRET;

      if (!secret) {
        throw new Error('JWT secret not configured');
      }

      // Check if token is blacklisted
      if (this.blacklistedTokens.has(token)) {
        throw new Error('Token has been revoked');
      }

      const decoded = jwt.verify(token, secret, {
        issuer: 'isp-management',
        audience: 'isp-client'
      });

      // Validate token type
      if (decoded.type !== type) {
        throw new Error(`Invalid token type. Expected ${type}, got ${decoded.type}`);
      }

      // For refresh tokens, check if it exists in store
      if (type === 'refresh' && decoded.tokenId) {
        const tokenData = this.refreshTokenStore.get(decoded.tokenId);
        if (!tokenData) {
          throw new Error('Refresh token not found or expired');
        }
        
        // Update last used time
        tokenData.lastUsed = Date.now();
        this.refreshTokenStore.set(decoded.tokenId, tokenData);
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Rotate refresh token
   */
  rotateRefreshToken(oldTokenId, userId) {
    // Invalidate old token
    const oldTokenData = this.refreshTokenStore.get(oldTokenId);
    if (oldTokenData) {
      // Check rotation count to prevent abuse
      if (oldTokenData.rotationCount >= 5) {
        // Too many rotations, possible attack
        this.refreshTokenStore.delete(oldTokenId);
        throw new Error('Refresh token rotation limit exceeded');
      }
    }

    // Delete old token
    this.refreshTokenStore.delete(oldTokenId);

    // Generate new refresh token
    const { refreshToken, tokenId } = this.generateRefreshToken(userId);
    
    // Track rotation
    const newTokenData = this.refreshTokenStore.get(tokenId);
    newTokenData.rotationCount = (oldTokenData?.rotationCount || 0) + 1;
    this.refreshTokenStore.set(tokenId, newTokenData);

    return { refreshToken, tokenId };
  }

  /**
   * Revoke token
   */
  revokeToken(token) {
    this.blacklistedTokens.add(token);
    
    // If it's a refresh token, remove from store
    try {
      const decoded = jwt.decode(token);
      if (decoded?.tokenId) {
        this.refreshTokenStore.delete(decoded.tokenId);
      }
    } catch (error) {
      // Ignore decoding errors
    }
  }

  /**
   * Revoke all tokens for a user
   */
  revokeUserTokens(userId) {
    // Remove all refresh tokens for the user
    for (const [tokenId, data] of this.refreshTokenStore.entries()) {
      if (data.userId === userId) {
        this.refreshTokenStore.delete(tokenId);
      }
    }
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens() {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Clean refresh token store
    for (const [tokenId, data] of this.refreshTokenStore.entries()) {
      if (now - data.createdAt > maxAge) {
        this.refreshTokenStore.delete(tokenId);
      }
    }

    // Clean blacklisted tokens (remove very old ones)
    // In production, this should be stored in Redis with TTL
    if (this.blacklistedTokens.size > 10000) {
      this.blacklistedTokens.clear(); // Reset if too many
    }
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto
      .createHmac('sha256', process.env.CSRF_SECRET || 'csrf-secret')
      .update(sessionId + token)
      .digest('hex');
    
    return `${token}.${hash}`;
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(token, sessionId) {
    if (!token || !sessionId) return false;
    
    const [tokenPart, hashPart] = token.split('.');
    if (!tokenPart || !hashPart) return false;
    
    const expectedHash = crypto
      .createHmac('sha256', process.env.CSRF_SECRET || 'csrf-secret')
      .update(sessionId + tokenPart)
      .digest('hex');
    
    return hashPart === expectedHash;
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded?.exp) {
        return new Date(decoded.exp * 1000);
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  /**
   * Check if token is about to expire
   */
  isTokenExpiringSoon(token, thresholdMinutes = 5) {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    
    const now = new Date();
    const timeUntilExpiry = expiry - now;
    const threshold = thresholdMinutes * 60 * 1000;
    
    return timeUntilExpiry <= threshold;
  }
}

// Singleton instance
const tokenManager = new TokenManager();

module.exports = tokenManager;
