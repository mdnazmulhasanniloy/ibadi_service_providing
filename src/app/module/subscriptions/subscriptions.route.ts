import { Router } from 'express';
import { subscriptionsController } from './subscriptions.controller.js';
import auth from '@app/middleware/auth.js';
import { Role, USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.post(
  '/free-trial',
  auth(USER_ROLE.service_provider),
  subscriptionsController.getFreeTrial,
);
router.post(
  '/manual-update',
  auth(USER_ROLE.service_provider),
  // validateRequest(SubscriptionValidation.manualSubscriptionValidation),
  subscriptionsController.manualSubscriptionUpdate,
);
// router.patch('/:id', subscriptionsController.updateSubscriptions);
// router.delete('/:id', subscriptionsController.deleteSubscriptions);
router.get(
  '/my-subscriptions',
  auth(USER_ROLE.service_provider),
  subscriptionsController.getMySubscriptions,
);

router.get(
  '/active',
  auth(USER_ROLE.service_provider),
  subscriptionsController.getActiveSubscriptions,
);

router.get(
  '/current',
  auth(USER_ROLE.service_provider),
  subscriptionsController.getCurrentSubscription,
);

router.get(
  '/:id',
  auth(
    USER_ROLE.service_provider,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
  ),
  subscriptionsController.getSubscriptionsById,
);

router.get(
  '/',
  auth(
    USER_ROLE.service_provider,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
  ),
  subscriptionsController.getAllSubscriptions,
);

export const subscriptionsRoutes = router;
