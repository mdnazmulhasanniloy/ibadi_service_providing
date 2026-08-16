import { Router } from 'express';
import { verificationRequestController } from './verificationRequest.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';
import multer, { memoryStorage } from 'multer';
import parseData from '@app/middleware/parseData.js';
import uploadMultiple from '@app/middleware/uploadMulti.js';

const router: Router = Router();
const uploads = multer({ storage: memoryStorage() });
const userFiles: any[] = [
  { name: 'palliativeCare', maxCount: 5 },
  { name: 'drivingLicense', maxCount: 5 },
  { name: 'businessProfile', maxCount: 5 },
  { name: 'document', maxCount: 5 },
];

router.post(
  '/',
  auth(USER_ROLE.service_provider),
  uploads.fields(userFiles),
  parseData(),
  uploadMultiple(userFiles),
  verificationRequestController.createVerificationRequest,
);
router.patch(
  '/approve/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  verificationRequestController.approveVerificationRequest,
);
router.patch(
  '/reject/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  verificationRequestController.rejectVerificationRequest,
);
router.delete(
  '/:id',
  auth(
    USER_ROLE.service_provider,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
  ),
  verificationRequestController.deleteVerificationRequest,
);

router.get(
  '/my-requests',
  auth(
    USER_ROLE.service_provider,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
  ),
  verificationRequestController.getMyVerificationRequest,
);

router.get(
  '/:id',
  auth(
    USER_ROLE.service_provider,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
  ),
  verificationRequestController.getVerificationRequestById,
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  verificationRequestController.getAllVerificationRequest,
);

export const verificationRequestRoutes = router;
