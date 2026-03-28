import { Router } from 'express';
import { bookingsController } from './bookings.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.post('/', auth(USER_ROLE.user), bookingsController.createBookings);

router.patch(
  '/:id',
  auth(USER_ROLE.service_provider),
  bookingsController.updateBookings,
);

router.patch(
  '/:id/status',
  auth(USER_ROLE.service_provider, USER_ROLE.user),
  bookingsController.changeBookingStatus,
);

router.delete(
  '/:id',
  auth(
    USER_ROLE.service_provider,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
  ),
  bookingsController.deleteBookings,
);

router.get(
  '/:id',
  auth(
    USER_ROLE.service_provider,
    USER_ROLE.user,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
  ),
  bookingsController.getBookingsById,
);


router.get(
  '/',
  auth(
    USER_ROLE.service_provider,
    USER_ROLE.user,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
  ),
  
  bookingsController.getAllBookings,
);

export const bookingsRoutes = router;
