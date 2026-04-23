
import { Router } from 'express';
import { bookingsController } from './bookings.controller.js';

const router: Router = Router();

router.post('/', bookingsController.createBookings);
router.patch('/:id', bookingsController.updateBookings);
router.delete('/:id', bookingsController.deleteBookings);
router.get('/:id', bookingsController.getBookingsById);
router.get('/', bookingsController.getAllBookings);

export const bookingsRoutes = router;