import { Router } from 'express';
import { packagesController } from './packages.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  packagesController.createPackages,
);
router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  packagesController.updatePackages,
);
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  packagesController.deletePackages,
);
router.get('/:id', packagesController.getPackagesById);
router.get('/', packagesController.getAllPackages);

export const packagesRoutes = router;
