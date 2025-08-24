const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads', req.user.company_id.toString());
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and original extension
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const filename = `${basename}-${timestamp}${ext}`;
    cb(null, filename);
  },
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  // Allow images and PDFs
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Maximum 10 files per request
  },
  fileFilter: fileFilter,
});

// All routes require authentication
router.use(authenticateToken);

// Upload files
router.post('/upload', upload.array('files', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const uploadedFiles = req.files.map((file) => ({
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: `/api/files/${file.filename}`,
    uploadedAt: new Date().toISOString(),
  }));

  res.json({
    message: 'Files uploaded successfully',
    files: uploadedFiles,
  });
}));

// Get/serve uploaded file
router.get('/:filename', asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads', req.user.company_id.toString(), filename);

  try {
    await fs.access(filePath);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
}));

// Delete uploaded file
router.delete('/:filename', asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads', req.user.company_id.toString(), filename);

  try {
    await fs.unlink(filePath);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' });
    } else {
      throw error;
    }
  }
}));

// Upload files for specific inspection
router.post('/inspection/:inspectionId/upload', upload.array('files', 10), asyncHandler(async (req, res) => {
  const { inspectionId } = req.params;
  const companyId = req.user.company_id;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  // Verify inspection exists and belongs to company
  const { client } = require('../database');
  const inspectionResult = await client.query(
    'SELECT id FROM inspections WHERE id = $1 AND company_id = $2',
    [inspectionId, companyId],
  );

  if (inspectionResult.rows.length === 0) {
    return res.status(404).json({ error: 'Inspection not found' });
  }

  const uploadedFiles = req.files.map((file) => ({
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: `/api/files/${file.filename}`,
    uploadedAt: new Date().toISOString(),
    inspectionId: inspectionId,
  }));

  // TODO: Store file references in database if needed
  // For now, just return the file info

  res.json({
    message: 'Files uploaded successfully for inspection',
    files: uploadedFiles,
    inspectionId: inspectionId,
  });
}));

// Get files for specific inspection
router.get('/inspection/:inspectionId/files', asyncHandler(async (req, res) => {
  const { inspectionId } = req.params;
  const companyId = req.user.company_id;

  // Verify inspection exists and belongs to company
  const { client } = require('../database');
  const inspectionResult = await client.query(
    'SELECT id FROM inspections WHERE id = $1 AND company_id = $2',
    [inspectionId, companyId],
  );

  if (inspectionResult.rows.length === 0) {
    return res.status(404).json({ error: 'Inspection not found' });
  }

  // TODO: Get files from database if storing references
  // For now, just return empty array
  res.json({ files: [] });
}));

module.exports = router;
