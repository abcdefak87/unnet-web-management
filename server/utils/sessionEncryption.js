/**
 * WhatsApp Session Encryption Utility
 * Encrypts and decrypts WhatsApp session files for security
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SessionEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    
    // Get encryption key from environment or generate one
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  /**
   * Get or create encryption key
   */
  getOrCreateEncryptionKey() {
    const keyPath = path.join(__dirname, '../.session-key');
    
    try {
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath);
      }
    } catch (error) {
      console.warn('Could not read existing session key:', error.message);
    }

    // Generate new key
    const key = crypto.randomBytes(this.keyLength);
    
    try {
      fs.writeFileSync(keyPath, key);
      console.log('Generated new session encryption key');
    } catch (error) {
      console.warn('Could not save session key:', error.message);
    }

    return key;
  }

  /**
   * Encrypt session data
   */
  encryptSessionData(data) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('whatsapp-session'));

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Session encryption failed:', error);
      throw new Error('Failed to encrypt session data');
    }
  }

  /**
   * Decrypt session data
   */
  decryptSessionData(encryptedData) {
    try {
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from('whatsapp-session'));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Session decryption failed:', error);
      throw new Error('Failed to decrypt session data');
    }
  }

  /**
   * Encrypt session file
   */
  encryptSessionFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Session file not found');
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const sessionData = JSON.parse(data);
      
      const encryptedData = this.encryptSessionData(sessionData);
      
      // Create backup of original file
      const backupPath = filePath + '.backup';
      fs.copyFileSync(filePath, backupPath);
      
      // Write encrypted data
      fs.writeFileSync(filePath, JSON.stringify(encryptedData, null, 2));
      
      console.log(`Encrypted session file: ${path.basename(filePath)}`);
      return true;
    } catch (error) {
      console.error('Failed to encrypt session file:', error);
      return false;
    }
  }

  /**
   * Decrypt session file
   */
  decryptSessionFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Session file not found');
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const encryptedData = JSON.parse(data);
      
      // Check if file is already decrypted
      if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.tag) {
        return JSON.parse(data); // Already decrypted
      }

      const sessionData = this.decryptSessionData(encryptedData);
      
      // Write decrypted data
      fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
      
      console.log(`Decrypted session file: ${path.basename(filePath)}`);
      return sessionData;
    } catch (error) {
      console.error('Failed to decrypt session file:', error);
      throw error;
    }
  }

  /**
   * Encrypt all session files in directory
   */
  encryptAllSessions(sessionDir) {
    try {
      if (!fs.existsSync(sessionDir)) {
        console.log('Session directory does not exist');
        return { success: 0, failed: 0 };
      }

      const files = fs.readdirSync(sessionDir);
      const sessionFiles = files.filter(file => 
        file.endsWith('.json') && 
        !file.endsWith('.backup') &&
        !file.includes('creds') // Don't encrypt credentials file
      );

      let success = 0;
      let failed = 0;

      for (const file of sessionFiles) {
        const filePath = path.join(sessionDir, file);
        if (this.encryptSessionFile(filePath)) {
          success++;
        } else {
          failed++;
        }
      }

      console.log(`Session encryption completed: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('Failed to encrypt all sessions:', error);
      return { success: 0, failed: 1 };
    }
  }

  /**
   * Decrypt all session files in directory
   */
  decryptAllSessions(sessionDir) {
    try {
      if (!fs.existsSync(sessionDir)) {
        console.log('Session directory does not exist');
        return { success: 0, failed: 0 };
      }

      const files = fs.readdirSync(sessionDir);
      const sessionFiles = files.filter(file => 
        file.endsWith('.json') && 
        !file.endsWith('.backup') &&
        !file.includes('creds') // Don't decrypt credentials file
      );

      let success = 0;
      let failed = 0;

      for (const file of sessionFiles) {
        const filePath = path.join(sessionDir, file);
        try {
          this.decryptSessionFile(filePath);
          success++;
        } catch (error) {
          console.error(`Failed to decrypt ${file}:`, error.message);
          failed++;
        }
      }

      console.log(`Session decryption completed: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('Failed to decrypt all sessions:', error);
      return { success: 0, failed: 1 };
    }
  }

  /**
   * Rotate encryption key (for security)
   */
  rotateEncryptionKey(sessionDir) {
    try {
      console.log('Rotating session encryption key...');
      
      // Decrypt all sessions with old key
      this.decryptAllSessions(sessionDir);
      
      // Generate new key
      const newKey = crypto.randomBytes(this.keyLength);
      const keyPath = path.join(__dirname, '../.session-key');
      
      // Backup old key
      if (fs.existsSync(keyPath)) {
        fs.copyFileSync(keyPath, keyPath + '.backup');
      }
      
      // Write new key
      fs.writeFileSync(keyPath, newKey);
      this.encryptionKey = newKey;
      
      // Re-encrypt all sessions with new key
      this.encryptAllSessions(sessionDir);
      
      console.log('Session encryption key rotated successfully');
      return true;
    } catch (error) {
      console.error('Failed to rotate encryption key:', error);
      return false;
    }
  }
}

module.exports = new SessionEncryption();
