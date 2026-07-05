const { MOCK_USER } = require('../config/mockUser');

const requireAuth = async (req, res, next) => {
  req.user = MOCK_USER;
  req.accessToken = null;
  next();
};

module.exports = requireAuth;
