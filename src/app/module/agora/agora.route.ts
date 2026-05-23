import { Router } from 'express';
import { agoraController } from './agora.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

 

router.get(
  '/token',
  auth(
    USER_ROLE.user,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
    USER_ROLE.service_provider,
  ),
  agoraController.generateToken,
);

export const agoraRoutes = router;
