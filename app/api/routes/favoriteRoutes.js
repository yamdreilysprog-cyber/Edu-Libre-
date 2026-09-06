const { Router } = require('express');
const { addFavorite, removeFavorite, getFavorites } = require('../controllers/favoriteController');
const { authenticate } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validator');
const { favoriteSchema } = require('../middlewares/schemas');

const router = Router();

router.get('/', authenticate, getFavorites);
router.post('/', authenticate, validateRequest(favoriteSchema), addFavorite);
router.delete('/:institutionId', authenticate, removeFavorite);

module.exports = router;
