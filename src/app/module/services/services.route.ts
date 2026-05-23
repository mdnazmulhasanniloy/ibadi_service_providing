import { Router } from 'express';
import { servicesController } from './services.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';
import multer from 'multer';
import parseData from '@app/middleware/parseData.js';
import uploadSingle from '@app/middleware/uploadSingle.js';

const router: Router = Router();
const uploads = multer({ storage: multer.memoryStorage() });

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  uploads.single('image'),
  parseData(),
  uploadSingle('image'),
  servicesController.createServices,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  uploads.single('image'),
  parseData(),
  uploadSingle('image'),
  servicesController.updateServices,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  servicesController.deleteServices,
);

router.get('/:id', servicesController.getServicesById);
router.get('/', servicesController.getAllServices);

export const servicesRoutes = router;
