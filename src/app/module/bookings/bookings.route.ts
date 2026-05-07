import { Router } from 'express';
import { bookingsController } from './bookings.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.post('/', auth(USER_ROLE.user), bookingsController.createBookings);

export const bookingsRoutes = router;
