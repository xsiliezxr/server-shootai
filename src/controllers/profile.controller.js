const profileService = require('../services/profile.service');

const getProfile = async (req, res) => {
  const profile = await profileService.ensureProfile(req.user, req.accessToken);

  res.status(200).json({
    success: true,
    data: profile,
  });
};

const updateProfile = async (req, res) => {
  const { displayName, gender } = req.body;

  await profileService.ensureProfile(req.user, req.accessToken);

  const profile = await profileService.upsertProfile(
    req.user.id,
    req.accessToken,
    {
      email: req.user.email,
      displayName,
      gender,
    }
  );

  res.status(200).json({
    success: true,
    data: profile,
  });
};

const uploadBodyPhoto = async (req, res) => {
  await profileService.ensureProfile(req.user, req.accessToken);

  const result = await profileService.setBodyPhoto(
    req.user.id,
    req.accessToken,
    req.file
  );

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = {
  getProfile,
  updateProfile,
  uploadBodyPhoto,
};
