/**
 * Multer Configuration
 * 
 * Handles file uploads like receipt images
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Make sure the upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check file type and put in appropriate subdirectory
    let subDir = 'misc';
    
    if (file.mimetype.startsWith('image/')) {
      subDir = 'images';
    } else if (file.mimetype === 'application/pdf') {
      subDir = 'documents';
    }
    
    const finalDir = path.join(uploadDir, subDir);
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }
    
    cb(null, finalDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique file name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, `${req.user.id}-${uniqueSuffix}${fileExt}`);
  }
});

// File filter to allow only certain file types
const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/gif' ||
    file.mimetype === 'application/pdf'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload an image (JPEG, PNG, GIF) or PDF file.'), false);
  }
};

// Configure upload limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
    files: 1 // Allow only one file per request
  }
});

module.exports = upload; 