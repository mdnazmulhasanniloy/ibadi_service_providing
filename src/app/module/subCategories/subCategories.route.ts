import { Router } from 'express';
import { subCategoriesController } from './subCategories.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';
import parseData from '@app/middleware/parseData.js';
import uploadSingle from '@app/middleware/uploadSingle.js';
import multer, { memoryStorage } from 'multer';
import validateRequest from '@app/middleware/validateRequest.js';
import subCategoriesValidation from './subCategories.validation.js';

const router: Router = Router();
const uploads = multer({ storage: memoryStorage() });

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  uploads.single('image'),
  parseData(),
  uploadSingle('image'),
  validateRequest(subCategoriesValidation.create),
  subCategoriesController.createSubCategories,
);
router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  uploads.single('image'),
  parseData(),
  uploadSingle('image'),
  validateRequest(subCategoriesValidation.update),
  subCategoriesController.updateSubCategories,
);
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  subCategoriesController.deleteSubCategories,
);
router.get('/:id', subCategoriesController.getSubCategoriesById);
router.get('/', subCategoriesController.getAllSubCategories);

export const subCategoriesRoutes = router;
