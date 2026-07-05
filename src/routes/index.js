const { Router } = require('express');
const healthRoutes = require('./health.routes');
const projectRoutes = require('./project.routes');
const creativeDumpRoutes = require('./creativeDump.routes');
const catalogRoutes = require('./catalog.routes');
const scrapingRoutes = require('./scraping.routes');
const fashionRoutes = require('./fashion.routes');
const styleMatchRoutes = require('./styleMatch.routes');
const visionRoutes = require('./vision.routes');
const whatsappRoutes = require('./whatsapp.routes');
const empresaRoutes = require('./empresa.routes');
const clienteRoutes = require('./cliente.routes');
const requirementsRoutes = require('./requirements.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/empresas', empresaRoutes);
router.use('/clientes', clienteRoutes);
router.use('/projects', projectRoutes);
router.use('/creative-dump', creativeDumpRoutes);
router.use('/catalog', catalogRoutes);
router.use('/catalog', scrapingRoutes);
router.use('/fashion-matcher', fashionRoutes);
router.use('/style-match', styleMatchRoutes);
router.use('/requirements', requirementsRoutes);
router.use('/vision', visionRoutes);
router.use('/whatsapp', whatsappRoutes);

module.exports = router;
