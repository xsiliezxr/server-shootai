const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { styleMatch } = require('../controllers/styleMatch.controller');
const { styleMatchUpload } = require('../middleware/upload');

const router = Router();

router.post('/', styleMatchUpload, asyncHandler(styleMatch));

module.exports = router;
