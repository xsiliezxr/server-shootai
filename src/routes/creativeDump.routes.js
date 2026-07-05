const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const multer = require('multer');
const AppError = require('../utils/appError');
const { ingestCreativeDump } = require('../controllers/creativeDump.controller');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const name = (file.originalname || '').toLowerCase();
  const isImage = file.mimetype.startsWith('image/');
  const isDoc =
    file.mimetype === 'application/pdf' ||
    file.mimetype.startsWith('text/') ||
    name.endsWith('.pdf') ||
    name.endsWith('.txt') ||
    name.endsWith('.md');

  if (isImage || isDoc) {
    cb(null, true);
    return;
  }

  cb(new AppError('Only images or PDF/TXT/MD documents are allowed', 400), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 5 },
]);

const router = Router();

router.post('/', upload, asyncHandler(ingestCreativeDump));

module.exports = router;
