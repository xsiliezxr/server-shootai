const multer = require('multer');
const AppError = require('../utils/appError');

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }

  cb(new AppError('Only image files are allowed', 400), false);
};

const documentFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'text/plain',
    'text/markdown',
  ];
  const name = (file.originalname || '').toLowerCase();

  if (
    allowed.includes(file.mimetype) ||
    name.endsWith('.pdf') ||
    name.endsWith('.txt') ||
    name.endsWith('.md')
  ) {
    cb(null, true);
    return;
  }

  cb(new AppError('Only PDF, TXT or MD documents are allowed', 400), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const uploadDocuments = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: documentFilter,
});

const styleMatchUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 5 },
]);

module.exports = {
  uploadSingle: upload.single('image'),
  uploadMultiple: upload.array('images', 10),
  uploadDocuments: uploadDocuments.array('documents', 5),
  styleMatchUpload,
};
