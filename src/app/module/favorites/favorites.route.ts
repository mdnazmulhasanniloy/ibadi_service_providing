import { Router } from 'express';
import { favoritesController } from './favorites.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

// ======================================================
// 🔥 Favorites Routes
// ======================================================
router.post('/', auth(USER_ROLE.user), favoritesController.createFavorites);
router.get('/:id', auth(USER_ROLE.user), favoritesController.getFavoritesById);
router.patch('/:id', auth(USER_ROLE.user), favoritesController.updateFavorites);
router.get('/', auth(USER_ROLE.user), favoritesController.getAllFavorites);
router.delete(
  '/:id',
  auth(USER_ROLE.user),
  favoritesController.deleteFavorites,
);

export const favoritesRoutes = router;
