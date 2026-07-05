const projectService = require('./project.service');
const n8nService = require('./n8n.service');
const AppError = require('../utils/appError');

const buildAnalysisMessage = (project) => {
  const recommendation = project.visionAnalysis?.recommendation || {};
  const garments = project.recommendedGarments || [];
  const hasVision = recommendation.camera || recommendation.lens || recommendation.pose;

  const lines = [`Proyecto: ${project.name}`];

  if (hasVision) {
    lines.push('Modelo analizado con exito. Ficha de composicion:');
    if (recommendation.camera) lines.push(`- Camara: ${recommendation.camera}`);
    if (recommendation.lens) lines.push(`- Lente: ${recommendation.lens}`);
    if (recommendation.pose) lines.push(`- Pose recomendada: ${recommendation.pose}`);
    if (recommendation.rationale) lines.push(`- Motivo: ${recommendation.rationale}`);
  } else {
    lines.push('Aun no hay analisis de vision para este proyecto.');
  }

  if (garments.length > 0) {
    lines.push('');
    lines.push(`Looks curados (${garments.length}):`);
    garments.slice(0, 5).forEach((g, i) => {
      lines.push(`${i + 1}. ${g.name}${g.brand ? ` - ${g.brand}` : ''}`);
    });
  }

  return lines.join('\n');
};

const buildAnalysisTemplate = (project) => ({
  projectId: project._id,
  projectName: project.name,
  status: project.status,
  vision: {
    camera: project.visionAnalysis?.recommendation?.camera || '',
    lens: project.visionAnalysis?.recommendation?.lens || '',
    pose: project.visionAnalysis?.recommendation?.pose || '',
    rationale: project.visionAnalysis?.recommendation?.rationale || '',
    proportions: project.visionAnalysis?.proportions || {},
    modelImage: project.visionAnalysis?.modelImage?.url || '',
  },
  looks: (project.recommendedGarments || []).map((g) => ({
    name: g.name,
    brand: g.brand,
    type: g.type,
    imageUrl: g.imageUrl,
    productUrl: g.productUrl,
  })),
});

const handleInboundWebhook = async (payload) => {
  const projectId = payload.projectId;

  let project = null;

  if (projectId) {
    project = await projectService.findProjectById(projectId);
  }

  const n8nResult = await n8nService.forwardToN8n(payload, 'whatsapp.inbound');

  const event = {
    direction: 'inbound',
    from: payload.from || payload.wa_id || '',
    type: payload.type || 'message',
    payload,
    receivedAt: new Date().toISOString(),
  };

  if (project) {
    await projectService.addWhatsappEvent(project._id, event);
  }

  return {
    received: true,
    projectId: project?._id || null,
    event,
    n8n: n8nResult,
  };
};

const sendOutboundMessage = async ({ projectId, to, type = 'message', payload }) => {
  if (!to) {
    throw new AppError('Recipient "to" is required', 400);
  }

  const project = projectId ? await projectService.findProjectById(projectId) : null;

  const outboundPayload = {
    to,
    type,
    projectId: project?._id || null,
    ...payload,
  };

  const n8nResult = await n8nService.forwardToN8n(
    outboundPayload,
    'whatsapp.outbound'
  );

  const event = {
    direction: 'outbound',
    from: 'system',
    type,
    payload: outboundPayload,
    receivedAt: new Date().toISOString(),
  };

  if (project) {
    await projectService.addWhatsappEvent(project._id, event);
  }

  return {
    sent: true,
    projectId: project?._id || null,
    event,
    n8n: n8nResult,
  };
};

const sendAnalysisSummary = async ({ projectId, to }) => {
  if (!to) {
    throw new AppError('Recipient "to" is required', 400);
  }

  const project = await projectService.findProjectById(projectId);

  const message = buildAnalysisMessage(project);
  const template = buildAnalysisTemplate(project);

  const outboundPayload = {
    to,
    type: 'analysis_summary',
    projectId: project._id,
    message,
    template,
  };

  const n8nResult = await n8nService.forwardToN8n(
    outboundPayload,
    'whatsapp.analysis'
  );

  await projectService.addWhatsappEvent(project._id, {
    direction: 'outbound',
    from: 'system',
    type: 'analysis_summary',
    payload: outboundPayload,
    receivedAt: new Date().toISOString(),
  });

  return {
    sent: true,
    projectId: project._id,
    message,
    template,
    n8n: n8nResult,
  };
};

module.exports = {
  handleInboundWebhook,
  sendOutboundMessage,
  sendAnalysisSummary,
  buildAnalysisMessage,
  buildAnalysisTemplate,
};
