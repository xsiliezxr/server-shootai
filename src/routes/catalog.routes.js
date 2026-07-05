const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { addGarments, listGarments, colorMatch } = require('../controllers/catalog.controller');

const router = Router();

router.post('/', asyncHandler(addGarments));
router.get('/', asyncHandler(listGarments));
router.post('/color-match', asyncHandler(colorMatch));

module.exports = router;
