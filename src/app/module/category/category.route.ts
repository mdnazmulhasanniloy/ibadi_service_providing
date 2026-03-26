import auth from '@app/middleware/auth.js';
import { Router } from 'express';
import multer from 'multer';
import { USER_ROLE } from '../users/user.constants.js';
import parseData from '@app/middleware/parseData.js';
import uploadSingle from '@app/middleware/uploadSingle.js';
import validateRequest from '@app/middleware/validateRequest.js';
import categoryValidation from './category.validation.js';
import { categoryController } from './category.controller.js';

const router: Router = Router();
const uploads = multer({ storage: multer.memoryStorage() });

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  uploads.single('image'),
  parseData(),
  uploadSingle('image'),
  validateRequest(categoryValidation.create),
  categoryController.createCategory,
);
router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  uploads.single('image'),
  parseData(),
  uploadSingle('image'),
  validateRequest(categoryValidation.update),
  categoryController.updateCategory,
);
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  categoryController.deleteCategory,
);
router.get('/:id', categoryController.getCategoryById);
router.get('/', categoryController.getAllCategory);

export const categoryRoutes = router;
