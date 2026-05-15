import { Router } from 'express';
import { paymentsController } from './payments.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.post(
  '/payout',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  paymentsController.createPayment,
);
router.get('/confirm-payment', paymentsController.confirmPayment);
router.get(
  '/auto-payment',
  auth(USER_ROLE.user),
  paymentsController.autoPayment,
);

router.get(
  '/admin-card',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.sub_admin),
  paymentsController.getDashboardCards,
);
router.get(
  '/admin-chart',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.sub_admin),
  paymentsController.adminDashboardChart,
);
router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.sub_admin),
  paymentsController.getAllPayments,
);

export const paymentsRoutes = router;
