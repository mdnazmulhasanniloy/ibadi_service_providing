import parseData from '@app/middleware/parseData.js';
import { Router } from 'express';
import multer, { memoryStorage } from 'multer';
import { userController } from './user.controller.js';
import { USER_ROLE } from './user.constants.js';
import auth from '@app/middleware/auth.js';
import uploadMultiple from '@app/middleware/uploadMulti.js';

const router: Router = Router();
const storage = memoryStorage();
const upload = multer({ storage });

const userFiles: any[] = [
  { name: 'profile', maxCount: 1 },
  { name: 'images', maxCount: 5 },
  { name: 'palliativeCare', maxCount: 1 },
  { name: 'drivingLicense', maxCount: 1 },
  { name: 'businessProfiles', maxCount: 1 },
  { name: 'qualifiedCarer', maxCount: 1 },
];

router.post(
  '/',
  upload.single('profile'),
  parseData(),
  userController.createUser,
);

router.patch(
  '/update-my-profile',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
    USER_ROLE.user,
    USER_ROLE.service_provider,
  ),
  upload.single('profile'),
  parseData(),
  userController.updateMyProfile,
);

router.patch(
  '/service-provider-info',
  auth(USER_ROLE.service_provider),
  upload.fields(userFiles),
  parseData(),
  uploadMultiple(userFiles),
  userController.serviceProfileInfo,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  upload.single('profile'),
  parseData(),
  userController.updateUser,
);

router.delete(
  '/delete-my-account',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
    USER_ROLE.user,
    USER_ROLE.service_provider,
  ),
  userController.deleteMYAccount,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  userController.deleteUser,
);

router.get(
  '/my-profile',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.supper_admin,
    USER_ROLE.user,
    USER_ROLE.service_provider,
  ),
  userController.getMyProfile,
);

router.get('/:id', userController.getUserById);

router.get('/', auth(USER_ROLE.admin), userController.getAllUser);

export const userRoutes = router;
