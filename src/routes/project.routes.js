const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  exportProject,
} = require('../controllers/project.controller');

const router = Router();

router.post('/', asyncHandler(createProject));
router.get('/', asyncHandler(getProjects));
router.get('/:id/export', asyncHandler(exportProject));
router.get('/:id', asyncHandler(getProjectById));
router.patch('/:id', asyncHandler(updateProject));
router.delete('/:id', asyncHandler(deleteProject));

module.exports = router;
