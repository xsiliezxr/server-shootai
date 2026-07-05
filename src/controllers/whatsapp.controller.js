const whatsappService = require('../services/whatsapp.service');
const AppError = require('../utils/appError');

const receiveWebhook = async (req, res) => {
  const result = await whatsappService.handleInboundWebhook(req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
};

const sendMessage = async (req, res) => {
  const { projectId, to, type, payload } = req.body;

  const result = await whatsappService.sendOutboundMessage({
    projectId,
    to,
    type,
    payload,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
};

const sendAnalysis = async (req, res) => {
  const { projectId, to } = req.body;

  if (!projectId) {
    throw new AppError('projectId is required', 400);
  }

  const result = await whatsappService.sendAnalysisSummary({ projectId, to });

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = { receiveWebhook, sendMessage, sendAnalysis };
