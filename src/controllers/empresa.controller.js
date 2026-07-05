const empresaService = require('../services/empresa.service');

const createEmpresa = async (req, res) => {
  const empresa = await empresaService.createEmpresa(req.body);

  res.status(201).json({
    success: true,
    data: empresa,
  });
};

const getEmpresas = async (req, res) => {
  const empresas = await empresaService.getEmpresas();

  res.status(200).json({
    success: true,
    data: empresas,
  });
};

const getEmpresaById = async (req, res) => {
  const empresa = await empresaService.getEmpresaById(req.params.id);

  res.status(200).json({
    success: true,
    data: empresa,
  });
};

const updateEmpresa = async (req, res) => {
  const empresa = await empresaService.updateEmpresa(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: empresa,
  });
};

const deleteEmpresa = async (req, res) => {
  await empresaService.deleteEmpresa(req.params.id);

  res.status(200).json({
    success: true,
    data: { message: 'Empresa deleted successfully' },
  });
};

module.exports = {
  createEmpresa,
  getEmpresas,
  getEmpresaById,
  updateEmpresa,
  deleteEmpresa,
};
