const leaderOnly = (req, res, next) => {
  if (req.user && req.user.role === 'leader') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Forbidden: Access restricted to project Leaders only.',
  });
};

module.exports = { leaderOnly };
