const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const {
  createFavorite,
  listFavorites,
  updateFavorite,
  deleteFavorite,
  suggestOccasion,
} = require('../controllers/favorites.controller');

const router = Router();

router.use(requireAuth);

router.post('/suggest-occasion', asyncHandler(suggestOccasion));
router.post('/', asyncHandler(createFavorite));
router.get('/', asyncHandler(listFavorites));
router.patch('/:favoriteId', asyncHandler(updateFavorite));
router.delete('/:favoriteId', asyncHandler(deleteFavorite));

module.exports = router;
