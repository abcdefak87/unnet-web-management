/**
 * Enhanced File Security Middleware
 * Implements comprehensive file validation and security measures
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// File type validation
const ALLOWED_MIME_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif']
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_REQUEST = 5;

// Dangerous file signatures to block
const DANGEROUS_SIGNATURES = [
  Buffer.from([0x4D, 0x5A]), // PE executable
  Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
  Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O executable
  Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Java class file
  Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP file (potential malware)
];

/**
 * Validate file signature (magic bytes)
 */
const validateFileSignature = (buffer, expectedMimeType) => {
  // Check for dangerous signatures
  for (const signature of DANGEROUS_SIGNATURES) {
    if (buffer.subarray(0, signature.length).equals(signature)) {
      return { valid: false, reason: 'Dangerous file type detected' };
    }
  }

  // Validate image signatures
  if (expectedMimeType.startsWith('image/')) {
    const imageSignatures = {
      'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
      'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46]), Buffer.from([0x57, 0x45, 0x42, 0x50])],
      'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])]
    };

    const signatures = imageSignatures[expectedMimeType];
    if (signatures) {
      const isValid = signatures.some(sig => 
        buffer.subarray(0, sig.length).equals(sig)
      );
      if (!isValid) {
        return { valid: false, reason: 'Invalid file signature for declared type' };
      }
    }
  }

  return { valid: true };
};

/**
 * Scan file for potential threats
 */
const scanFileForThreats = async (buffer, filename) => {
  try {
    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
      return { safe: false, reason: 'File size exceeds limit' };
    }

    // Check for embedded scripts in images
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /document\./i,
      /window\./i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return { safe: false, reason: 'Suspicious content detected' };
      }
    }

    // Validate image dimensions and metadata
    if (buffer.length > 0) {
      try {
        const metadata = await sharp(buffer).metadata();
        
        // Check for reasonable image dimensions
        if (metadata.width > 10000 || metadata.height > 10000) {
          return { safe: false, reason: 'Image dimensions too large' };
        }

        // Check for reasonable file size vs dimensions ratio
        const pixels = metadata.width * metadata.height;
        const bytesPerPixel = buffer.length / pixels;
        if (bytesPerPixel > 10) { // More than 10 bytes per pixel is suspicious
          return { safe: false, reason: 'Suspicious file size to dimensions ratio' };
        }
      } catch (error) {
        // If sharp can't process it, it might be corrupted or malicious
        return { safe: false, reason: 'Invalid or corrupted image file' };
      }
    }

    return { safe: true };
  } catch (error) {
    return { safe: false, reason: 'File scan failed' };
  }
};

/**
 * Generate secure filename
 */
const generateSecureFilename = (originalName, fieldName) => {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  
  // Sanitize field name
  const sanitizedField = fieldName.replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${sanitizedField}-${timestamp}-${randomBytes}${ext}`;
};

/**
 * Enhanced file validation middleware
 */
const enhancedFileValidation = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  // Check number of files
  if (req.files.length > MAX_FILES_PER_REQUEST) {
    return res.status(400).json({
      success: false,
      error: 'Too many files',
      message: `Maximum ${MAX_FILES_PER_REQUEST} files allowed per request`
    });
  }

  // Validate each file
  const validationPromises = req.files.map(async (file) => {
    try {
      // Read file buffer
      const buffer = fs.readFileSync(file.path);
      
      // Validate MIME type
      if (!ALLOWED_MIME_TYPES[file.mimetype]) {
        return { valid: false, filename: file.filename, reason: 'File type not allowed' };
      }

      // Validate file extension
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExts = ALLOWED_MIME_TYPES[file.mimetype];
      if (!allowedExts.includes(ext)) {
        return { valid: false, filename: file.filename, reason: 'File extension mismatch' };
      }

      // Validate file signature
      const signatureCheck = validateFileSignature(buffer, file.mimetype);
      if (!signatureCheck.valid) {
        return { valid: false, filename: file.filename, reason: signatureCheck.reason };
      }

      // Scan for threats
      const threatScan = await scanFileForThreats(buffer, file.originalname);
      if (!threatScan.safe) {
        return { valid: false, filename: file.filename, reason: threatScan.reason };
      }

      // Generate secure filename
      const secureFilename = generateSecureFilename(file.originalname, file.fieldname);
      
      // Move file to secure location
      const securePath = path.join(path.dirname(file.path), secureFilename);
      fs.renameSync(file.path, securePath);
      
      // Update file object
      file.filename = secureFilename;
      file.path = securePath;

      return { valid: true, filename: file.filename };
    } catch (error) {
      // Clean up file on error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return { valid: false, filename: file.filename, reason: 'File processing failed' };
    }
  });

  Promise.all(validationPromises)
    .then(results => {
      const invalidFiles = results.filter(r => !r.valid);
      
      if (invalidFiles.length > 0) {
        // Clean up all files if any are invalid
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
        
        return res.status(400).json({
          success: false,
          error: 'File validation failed',
          details: invalidFiles.map(f => ({
            filename: f.filename,
            reason: f.reason
          }))
        });
      }

      next();
    })
    .catch(error => {
      console.error('File validation error:', error);
      
      // Clean up files on error
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      
      res.status(500).json({
        success: false,
        error: 'File validation failed',
        message: 'Internal server error during file processing'
      });
    });
};

/**
 * Clean up uploaded files on request end
 */
const cleanupUploadedFiles = (req, res, next) => {
  const originalEnd = res.end;
  
  res.end = function(...args) {
    // Clean up files after response
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (error) {
            console.error('Failed to cleanup file:', file.path, error);
          }
        }
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

module.exports = {
  enhancedFileValidation,
  cleanupUploadedFiles,
  validateFileSignature,
  scanFileForThreats,
  generateSecureFilename
};
