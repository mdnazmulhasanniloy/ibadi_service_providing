import { Router } from 'express';
import { othersTaskOptionsController } from './othersTaskOptions.controller.js';
import { USER_ROLE } from '../users/user.constants.js';
import auth from '@app/middleware/auth.js';

const router: Router = Router();

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  othersTaskOptionsController.createOthersTaskOptions,
);
router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  othersTaskOptionsController.updateOthersTaskOptions,
);
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  othersTaskOptionsController.deleteOthersTaskOptions,
);
router.get('/:id', othersTaskOptionsController.getOthersTaskOptionsById);
router.get('/', othersTaskOptionsController.getAllOthersTaskOptions);

export const othersTaskOptionsRoutes = router;
