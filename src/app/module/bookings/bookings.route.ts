import { Router } from 'express';
import { bookingsController } from './bookings.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.post(
  '/',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  bookingsController.createBookings,
);
router.patch(
  '/accept/:id',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  bookingsController.acceptBookings,
);
router.patch(
  '/canceled/:id',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  bookingsController.canceledBookings,
);
router.patch(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.service_provider, USER_ROLE.admin),
  bookingsController.updateBookings,
);
router.get(
  '/user-booking',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  bookingsController.getUserBookings,
);
router.get(
  '/provider-booking',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  bookingsController.getServiceProviderBookings,
);
router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  bookingsController.getAllBookings,
);

export const bookingsRoutes = router;
