const axios = require('axios');

const forwardToN8n = async (payload, eventType = 'whatsapp.event') => {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (webhookUrl) {
    const response = await axios.post(
      webhookUrl,
      {
        eventType,
        timestamp: new Date().toISOString(),
        payload,
      },
      { timeout: 15000 }
    );

    return {
      forwarded: true,
      source: 'n8n',
      status: response.status,
      data: response.data,
    };
  }

  return {
    forwarded: false,
    source: 'mock',
    data: {
      eventType,
      payload,
      note: 'Mock n8n forward — set N8N_WEBHOOK_URL to connect real workflow',
    },
  };
};

module.exports = { forwardToN8n };
