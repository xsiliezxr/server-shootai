const { getSupabase } = require('../config/supabase');
const AppError = require('../utils/appError');

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      throw new AppError('Invalid or expired token', 401);
    }

    req.user = data.user;
    req.accessToken = token;
    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError('Authentication failed', 401));
  }
};

module.exports = requireAuth;
