const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFile } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

// File filter: allow pdf, doc, docx, png, jpg, jpeg, zip
const fileFilter = (req, file, cb) => {
  const allowed = /pdf|doc|docx|png|jpg|jpeg|zip|txt|ppt|pptx/i;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Allowed types: PDF, DOC, DOCX, PNG, JPG, JPEG, ZIP, PPT, PPTX'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter,
});

router.post('/', protect, upload.single('file'), uploadFile);

module.exports = router;
