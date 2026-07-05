const clienteService = require('../services/cliente.service');

const createCliente = async (req, res) => {
  const cliente = await clienteService.createCliente(req.body);

  res.status(201).json({
    success: true,
    data: cliente,
  });
};

const getClientes = async (req, res) => {
  const clientes = await clienteService.getClientes(req.query.empresaId);

  res.status(200).json({
    success: true,
    data: clientes,
  });
};

const getClienteById = async (req, res) => {
  const cliente = await clienteService.getClienteById(req.params.id);

  res.status(200).json({
    success: true,
    data: cliente,
  });
};

const updateCliente = async (req, res) => {
  const cliente = await clienteService.updateCliente(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: cliente,
  });
};

const deleteCliente = async (req, res) => {
  await clienteService.deleteCliente(req.params.id);

  res.status(200).json({
    success: true,
    data: { message: 'Cliente deleted successfully' },
  });
};

module.exports = {
  createCliente,
  getClientes,
  getClienteById,
  updateCliente,
  deleteCliente,
};
