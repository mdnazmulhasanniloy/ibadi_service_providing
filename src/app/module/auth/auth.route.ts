import { Router } from 'express';
import { authControllers } from './auth.controller.js';
import { USER_ROLE } from '../users/user.constants.js';
import auth from '@app/middleware/auth.js';

const router: Router = Router();

router.post('/login', authControllers.login);

router.post('/refresh-token', authControllers.refreshToken);

router.patch(
  '/change-password',
  auth(
    USER_ROLE.supper_admin,
    USER_ROLE.sub_admin,
    USER_ROLE.admin,
    USER_ROLE.user,
  ),
  authControllers.changePassword,
);

router.patch('/forgot-password', authControllers.forgotPassword);
router.patch('/reset-password', authControllers.resetPassword);

export const authRoutes = router;
