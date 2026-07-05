const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { styleMatchUpload, uploadSingle } = require('../middleware/upload');
const {
  submitRequirements,
  processRequirements,
  generateShootPlan,
} = require('../controllers/requirements.controller');

const router = Router();

router.post('/', styleMatchUpload, asyncHandler(submitRequirements));
router.post('/:projectId/process', asyncHandler(processRequirements));
router.post(
  '/:projectId/shoot-plan',
  uploadSingle,
  asyncHandler(generateShootPlan)
);

module.exports = router;
