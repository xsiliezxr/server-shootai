const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const {
  createCliente,
  getClientes,
  getClienteById,
  updateCliente,
  deleteCliente,
} = require('../controllers/cliente.controller');

const router = Router();

router.post('/', asyncHandler(createCliente));
router.get('/', asyncHandler(getClientes));
router.get('/:id', asyncHandler(getClienteById));
router.patch('/:id', asyncHandler(updateCliente));
router.delete('/:id', asyncHandler(deleteCliente));

module.exports = router;
