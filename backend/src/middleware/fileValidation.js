/**
 * Secure File Upload Validation and Processing Middleware
 * Provides comprehensive file security including virus scanning, type validation,
 * and secure storage handling
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const sharp = require('sharp');
const { fileTypeFromBuffer } = require('file-type');

/**
 * File type configurations for different upload categories
 */
const fileConfigs = {
  images: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    maxSize: 10 * 1024 * 1024, // 10MB
    requireImageProcessing: true,
  },
  documents: {
    allowedTypes: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['.pdf', '.txt', '.doc', '.docx'],
    maxSize: 25 * 1024 * 1024, // 25MB
    requireImageProcessing: false,
  },
  reports: {
    allowedTypes: ['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    allowedExtensions: ['.pdf', '.csv', '.xlsx'],
    maxSize: 50 * 1024 * 1024, // 50MB
    requireImageProcessing: false,
  },
};

/**
 * Malicious file patterns to detect
 */
const maliciousPatterns = [
  // Script injections
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  
  // Executable signatures
  /MZ[\x00-\xFF]{58}PE/g, // PE executable header
  /\x7fELF/g, // ELF executable header
  /\xca\xfe\xba\xbe/g, // Java class file
  
  // PHP/Server-side code
  /<\?php/gi,
  /<%[\s\S]*?%>/g,
  /\${[\s\S]*?}/g,
];

/**
 * Create secure multer configuration
 */
function createSecureUpload(category = 'images', options = {}) {
  const config = fileConfigs[category];
  if (!config) {
    throw new Error(`Unknown file category: ${category}`);
  }

  const storage = multer.memoryStorage(); // Store in memory for validation

  return multer({
    storage,
    limits: {
      fileSize: config.maxSize,
      files: options.maxFiles || 10,
    },
    fileFilter: (req, file, cb) => {
      try {
        // Basic MIME type check
        if (!config.allowedTypes.includes(file.mimetype)) {
          return cb(new Error(`Invalid file type. Allowed: ${config.allowedTypes.join(', ')}`));
        }

        // Extension check
        const ext = path.extname(file.originalname).toLowerCase();
        if (!config.allowedExtensions.includes(ext)) {
          return cb(new Error(`Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`));
        }

        // Filename validation
        const filename = path.basename(file.originalname, ext);
        if (!/^[a-zA-Z0-9_-]+$/.test(filename)) {
          return cb(new Error('Filename contains invalid characters'));
        }

        cb(null, true);
      } catch (error) {
        cb(error);
      }
    },
  });
}

/**
 * Advanced file validation middleware
 */
function validateFile(category = 'images') {
  return async (req, res, next) => {
    if (!req.files && !req.file) {
      return next();
    }

    const config = fileConfigs[category];
    const files = req.files || [req.file];

    try {
      for (const file of files) {
        if (!file || !file.buffer) continue;

        // Validate actual file type against declared MIME type
        const detectedType = await fileTypeFromBuffer(file.buffer);
        if (!detectedType || !config.allowedTypes.includes(detectedType.mime)) {
          throw new Error(`File type mismatch. Detected: ${detectedType?.mime || 'unknown'}`);
        }

        // Check for malicious content
        await scanForMaliciousContent(file.buffer);

        // Additional validation based on file type
        if (config.requireImageProcessing && detectedType.mime.startsWith('image/')) {
          await validateImageFile(file.buffer);
        }

        if (detectedType.mime === 'application/pdf') {
          await validatePDFFile(file.buffer);
        }

        // Generate secure filename
        file.secureFilename = generateSecureFilename(file.originalname, detectedType.ext);
        file.validatedType = detectedType;
      }

      next();
    } catch (error) {
      console.error('File validation error:', error);
      res.status(400).json({
        error: 'File validation failed',
        details: error.message,
      });
    }
  };
}

/**
 * Scan file content for malicious patterns
 */
async function scanForMaliciousContent(buffer) {
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10240)); // First 10KB

  for (const pattern of maliciousPatterns) {
    if (pattern.test(content)) {
      throw new Error('Potentially malicious content detected');
    }
  }

  // Check for suspicious binary patterns
  const suspiciousBytes = [
    [0x4D, 0x5A], // MZ (PE executable)
    [0x7F, 0x45, 0x4C, 0x46], // ELF executable
    [0xCA, 0xFE, 0xBA, 0xBE], // Java class
  ];

  for (const pattern of suspiciousBytes) {
    if (buffer.length >= pattern.length) {
      let match = true;
      for (let i = 0; i < pattern.length; i++) {
        if (buffer[i] !== pattern[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        throw new Error('Executable file detected');
      }
    }
  }
}

/**
 * Validate image files using Sharp
 */
async function validateImageFile(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    
    // Check image dimensions (prevent zip bombs)
    if (metadata.width > 10000 || metadata.height > 10000) {
      throw new Error('Image dimensions too large');
    }

    // Check for reasonable file size vs dimensions ratio
    const expectedSize = metadata.width * metadata.height * 3; // Rough RGB estimate
    if (buffer.length > expectedSize * 10) {
      throw new Error('Suspicious image file size');
    }

    return metadata;
  } catch (error) {
    throw new Error(`Invalid image file: ${error.message}`);
  }
}

/**
 * Basic PDF validation
 */
async function validatePDFFile(buffer) {
  // Check PDF header
  const pdfHeader = buffer.slice(0, 4).toString();
  if (pdfHeader !== '%PDF') {
    throw new Error('Invalid PDF file');
  }

  // Check for embedded JavaScript (basic check)
  const content = buffer.toString('utf8');
  const jsPatterns = [
    /\/JavaScript/gi,
    /\/JS/gi,
    /app\.alert/gi,
    /this\.print/gi,
  ];

  for (const pattern of jsPatterns) {
    if (pattern.test(content)) {
      throw new Error('PDF contains potentially unsafe JavaScript');
    }
  }
}

/**
 * Generate secure filename with timestamp and hash
 */
function generateSecureFilename(originalName, extension) {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('md5').update(originalName + timestamp).digest('hex').slice(0, 8);
  
  return `${timestamp}_${randomBytes}_${hash}.${extension}`;
}

/**
 * Process and optimize uploaded images
 */
async function processImage(file, options = {}) {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 85,
    format = 'jpeg',
  } = options;

  try {
    let pipeline = sharp(file.buffer);

    // Get metadata
    const metadata = await pipeline.metadata();

    // Resize if necessary
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert format and compress
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 9 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
    }

    // Remove metadata for privacy
    pipeline = pipeline.removeAlpha();

    const processedBuffer = await pipeline.toBuffer();

    return {
      buffer: processedBuffer,
      metadata: await sharp(processedBuffer).metadata(),
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * Secure file storage with virus scanning simulation
 */
async function secureFileStorage(file, uploadPath) {
  try {
    // Simulate virus scanning (in production, integrate with ClamAV or similar)
    await simulateVirusScan(file.buffer);

    // Ensure upload directory exists
    await fs.mkdir(uploadPath, { recursive: true });

    // Write file securely
    const filePath = path.join(uploadPath, file.secureFilename);
    await fs.writeFile(filePath, file.buffer, { mode: 0o644 });

    // Set file permissions (Unix systems)
    if (process.platform !== 'win32') {
      await fs.chmod(filePath, 0o644);
    }

    return {
      path: filePath,
      filename: file.secureFilename,
      size: file.buffer.length,
      type: file.validatedType.mime,
    };
  } catch (error) {
    throw new Error(`File storage failed: ${error.message}`);
  }
}

/**
 * Simulate virus scanning (placeholder for real implementation)
 */
async function simulateVirusScan(buffer) {
  // In production, integrate with actual virus scanner
  // For now, just check for EICAR test signature
  const eicarSignature = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  const content = buffer.toString();
  
  if (content.includes(eicarSignature)) {
    throw new Error('Virus detected: EICAR test file');
  }

  // Simulate scanning delay
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * File cleanup middleware for removing temporary files
 */
function fileCleanup() {
  return (req, res, next) => {
    // Store original end function
    const originalEnd = res.end;

    // Override end function to cleanup files
    res.end = function(...args) {
      // Cleanup uploaded files if they exist
      if (req.files || req.file) {
        const files = req.files || [req.file];
        files.forEach(file => {
          if (file.path && file.tempFile) {
            fs.unlink(file.path).catch(console.error);
          }
        });
      }

      // Call original end function
      originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * Create upload endpoint with full security
 */
function createSecureUploadEndpoint(category, processingOptions = {}) {
  const upload = createSecureUpload(category, processingOptions);
  
  return [
    upload.array('files', processingOptions.maxFiles || 10),
    validateFile(category),
    async (req, res, next) => {
      try {
        const results = [];
        const files = req.files || [req.file];

        for (const file of files) {
          if (!file) continue;

          let processedFile = file;

          // Process images if required
          if (fileConfigs[category].requireImageProcessing && file.validatedType.mime.startsWith('image/')) {
            const processed = await processImage(file, processingOptions);
            processedFile.buffer = processed.buffer;
          }

          // Store file securely
          const uploadPath = path.join(process.cwd(), 'uploads', category);
          const stored = await secureFileStorage(processedFile, uploadPath);
          
          results.push({
            originalName: file.originalname,
            filename: stored.filename,
            size: stored.size,
            type: stored.type,
            path: stored.path,
          });
        }

        req.uploadResults = results;
        next();
      } catch (error) {
        console.error('Upload processing error:', error);
        res.status(400).json({
          error: 'File upload failed',
          details: error.message,
        });
      }
    },
  ];
}

module.exports = {
  createSecureUpload,
  validateFile,
  processImage,
  secureFileStorage,
  createSecureUploadEndpoint,
  fileCleanup,
  generateSecureFilename,
};