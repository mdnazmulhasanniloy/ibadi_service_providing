import { Router } from 'express';
import { workScheduleController } from './workSchedule.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '@app/module/users/user.constants.js';

const router: Router = Router();

router.post(
  '/',
  auth(USER_ROLE.service_provider),
  workScheduleController.createWorkSchedule,
);
router.patch(
  '/:id',
  auth(USER_ROLE.service_provider),
  workScheduleController.updateWorkSchedule,
);
router.delete(
  '/:id',
  auth(USER_ROLE.service_provider),
  workScheduleController.deleteWorkSchedule,
);
router.get('/:id', workScheduleController.getWorkScheduleById);
router.get('/', workScheduleController.getAllWorkSchedule);

export const workScheduleRoutes = router;
