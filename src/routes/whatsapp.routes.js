const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const {
  receiveWebhook,
  sendMessage,
  sendAnalysis,
} = require('../controllers/whatsapp.controller');

const router = Router();

router.post('/webhook', asyncHandler(receiveWebhook));
router.post('/send', asyncHandler(sendMessage));
router.post('/send-analysis', asyncHandler(sendAnalysis));

module.exports = router;
