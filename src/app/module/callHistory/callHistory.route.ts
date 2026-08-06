import { Router } from 'express';
import { callHistoryController } from './callHistory.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';
import validateRequest from '@app/middleware/validateRequest.js';
import { createCallHistorySchema } from './callHistory.validation.js';

const router: Router = Router();

router.post(
  '/',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  validateRequest(createCallHistorySchema),
  callHistoryController.createCallHistory,
);
router.patch(
  '/:id/accept',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  callHistoryController.acceptCall,
);
router.patch(
  '/:id/reject',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  callHistoryController.rejectCall,
);
router.patch(
  '/:id/cancel',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  callHistoryController.cancelCall,
);
router.patch(
  '/:id/end',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  callHistoryController.endCall,
);
// router.patch('/:id', callHistoryController.updateCallHistory);
router.delete(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  callHistoryController.deleteCallHistory,
);
router.get(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  callHistoryController.getCallHistoryById,
);
router.get(
  '/',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  callHistoryController.getAllCallHistory,
);

export const callHistoryRoutes = router;
