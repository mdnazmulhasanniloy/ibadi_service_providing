import { Router } from 'express';
import { chatController } from './chat.controller.js';
import { USER_ROLE } from '../users/user.constants.js';
import auth from '@app/middleware/auth.js';

const router: Router = Router();

router.patch('/accept/:id', chatController.acceptChat);
router.patch('/block/:id', chatController.blockChat);
router.get(
  '/get-by-user-id/:receiverId',
  auth(
    USER_ROLE.user,
    USER_ROLE.admin,
    USER_ROLE.service_provider,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
  ),
  chatController.getChatByUserId,
);

export const chatRoutes = router;
