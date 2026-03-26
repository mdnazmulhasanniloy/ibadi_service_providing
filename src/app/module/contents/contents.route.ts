import { Router } from 'express';
import { contentController } from './content.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  contentController.updateContents,
);
router.get('/', contentController.getContents);

export const contentsRoutes = router;
