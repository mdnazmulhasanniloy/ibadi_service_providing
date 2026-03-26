import auth from '@app/middleware/auth.js';
import { Router } from 'express';
import { USER_ROLE } from '../users/user.constants.js';
import validateRequest from '@app/middleware/validateRequest.js';
import reviewsValidation from './reviews.validation.js';
import { reviewsController } from './reviews.controller.js';

const router: Router = Router();

router.post(
  '/',
  auth(USER_ROLE.user),
  validateRequest(reviewsValidation.create),
  reviewsController.createReviews,
);
router.delete(
  '/:id',
  auth(USER_ROLE.user),
  validateRequest(reviewsValidation.create),
  reviewsController.deleteReviews,
);
router.get('/:id', reviewsController.getReviewsById);
router.get('/', reviewsController.getAllReviews);

export const reviewsRoutes = router;
