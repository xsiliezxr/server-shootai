const healthService = require('../services/health.service');

const getHealth = (req, res) => {
  const data = healthService.getHealthStatus();

  res.status(200).json({
    success: true,
    data,
  });
};

module.exports = { getHealth };
