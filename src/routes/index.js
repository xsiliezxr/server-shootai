const { Router } = require('express');
const healthRoutes = require('./health.routes');
const projectRoutes = require('./project.routes');
const empresaRoutes = require('./empresa.routes');
const clienteRoutes = require('./cliente.routes');
const catalogRoutes = require('./catalog.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/empresas', empresaRoutes);
router.use('/clientes', clienteRoutes);
router.use('/projects', projectRoutes);
router.use('/catalog', catalogRoutes);

module.exports = router;
