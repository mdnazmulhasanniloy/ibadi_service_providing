import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.patch(
  '/',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
    USER_ROLE.user,
    USER_ROLE.service_provider,
  ),
  notificationController.readNotification,
);
router.delete(
  '/',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
    USER_ROLE.user,
    USER_ROLE.service_provider,
  ),
  notificationController.deleteNotification,
);
router.get(
  '/',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
    USER_ROLE.user,
    USER_ROLE.service_provider,
  ),
  notificationController.getNotification,
);

export const notificationRoutes = router;
