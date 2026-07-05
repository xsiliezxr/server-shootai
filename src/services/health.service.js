const getHealthStatus = () => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
});

module.exports = { getHealthStatus };
