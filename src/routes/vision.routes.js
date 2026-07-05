const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { uploadSingle } = require('../middleware/upload');
const { uploadModel } = require('../controllers/vision.controller');

const router = Router();

router.post('/upload-model', uploadSingle, asyncHandler(uploadModel));

module.exports = router;
