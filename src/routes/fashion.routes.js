const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { recommend } = require('../controllers/fashion.controller');

const router = Router();

router.post('/', asyncHandler(recommend));

module.exports = router;
