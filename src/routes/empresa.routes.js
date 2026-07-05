const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const {
  createEmpresa,
  getEmpresas,
  getEmpresaById,
  updateEmpresa,
  deleteEmpresa,
} = require('../controllers/empresa.controller');

const router = Router();

router.post('/', asyncHandler(createEmpresa));
router.get('/', asyncHandler(getEmpresas));
router.get('/:id', asyncHandler(getEmpresaById));
router.patch('/:id', asyncHandler(updateEmpresa));
router.delete('/:id', asyncHandler(deleteEmpresa));

module.exports = router;
