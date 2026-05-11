import { Router } from 'express';
import { experienceOptionsController } from './experienceOptions.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  experienceOptionsController.createExperienceOptions,
);
router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  experienceOptionsController.updateExperienceOptions,
);
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  experienceOptionsController.deleteExperienceOptions,
);
router.get('/:id', experienceOptionsController.getExperienceOptionsById);
router.get('/', experienceOptionsController.getAllExperienceOptions);

export const experienceOptionsRoutes = router;
