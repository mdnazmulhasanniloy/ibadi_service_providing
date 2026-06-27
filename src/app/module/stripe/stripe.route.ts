import { Router } from 'express';
import { stripeController } from './stripe.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.get(
  '/payment-method/add-link',
  auth(USER_ROLE.user),
  stripeController.addStripeCard,
);

// Stripe hosted add-card success page
router.get('/payment-method/add-page', stripeController.getStripeCardAddPage);

// Save card after Stripe setup intent/session
router.post(
  '/payment-method/save',
  auth(USER_ROLE.user),
  stripeController.saveStripeCard,
);
//save default payment method
router.post(
  '/payment-method/default/:paymentMethodId',
  auth(USER_ROLE.user),
  stripeController.setDefaultCard,
);


// connect account routes
router.patch(
  '/connect',
  auth(USER_ROLE.service_provider),
  stripeController.stripLinkAccount,
);
router.get('/return', stripeController.returnUrl);
router.get('/refresh/:id', stripeController.refresh);

router.get(
  '/get-customer',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  stripeController.getCustomerId,
);

// Get all saved cards
router.get(
  '/payment-method',
  auth(USER_ROLE.user),
  stripeController.getCardList,
);

// Delete saved card
router.delete(
  '/payment-method/:id',
  auth(USER_ROLE.user),
  stripeController.deleteCard,
);

export const stripeRoutes = router;
