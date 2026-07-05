const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const { styleMatchUpload, uploadSingle } = require('../middleware/upload');
const {
  submitRequirements,
  detectCategories,
  processRequirements,
  generateShootPlan,
} = require('../controllers/requirements.controller');

const router = Router();

router.use(requireAuth);

router.post('/', styleMatchUpload, asyncHandler(submitRequirements));
router.post('/:projectId/categories', asyncHandler(detectCategories));
router.post('/:projectId/process', asyncHandler(processRequirements));
router.post(
  '/:projectId/shoot-plan',
  uploadSingle,
  asyncHandler(generateShootPlan)
);

module.exports = router;
