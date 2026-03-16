import { Router } from 'express';
import { notificationController } from './notification.controller.js';

const router:Router = Router();

router.patch('/', notificationController.readNotification);
router.delete('/', notificationController.deleteNotification);
router.get('/', notificationController.getNotification);

export const notificationRoutes = router;
