const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const { uploadSingle } = require('../middleware/upload');
const {
  getProfile,
  updateProfile,
  uploadBodyPhoto,
} = require('../controllers/profile.controller');

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(getProfile));
router.put('/', asyncHandler(updateProfile));
router.post('/body-photo', uploadSingle, asyncHandler(uploadBodyPhoto));

module.exports = router;
