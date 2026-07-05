const favoritesService = require('../services/favorites.service');

const createFavorite = async (req, res) => {
  const favorite = await favoritesService.createFavorite(
    req.user.id,
    req.accessToken,
    req.body
  );

  res.status(201).json({
    success: true,
    data: favorite,
  });
};

const listFavorites = async (req, res) => {
  const { category, event, occasion } = req.query;
  const favorites = await favoritesService.listFavorites(
    req.user.id,
    req.accessToken,
    {
      category,
      event,
      occasion,
    }
  );

  res.status(200).json({
    success: true,
    data: favorites,
  });
};

const updateFavorite = async (req, res) => {
  const { favoriteId } = req.params;
  const favorite = await favoritesService.updateFavorite(
    req.user.id,
    req.accessToken,
    favoriteId,
    req.body
  );

  res.status(200).json({
    success: true,
    data: favorite,
  });
};

const deleteFavorite = async (req, res) => {
  const { favoriteId } = req.params;
  const result = await favoritesService.removeFavorite(
    req.user.id,
    req.accessToken,
    favoriteId
  );

  res.status(200).json({
    success: true,
    data: result,
  });
};

const suggestOccasion = async (req, res) => {
  const occasion = await favoritesService.suggestOccasionForOutfit(req.body);

  res.status(200).json({
    success: true,
    data: { occasion },
  });
};

module.exports = {
  createFavorite,
  listFavorites,
  updateFavorite,
  deleteFavorite,
  suggestOccasion,
};
