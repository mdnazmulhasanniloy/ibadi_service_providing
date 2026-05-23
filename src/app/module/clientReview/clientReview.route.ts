import { Router } from 'express';
import { clientReviewController } from './clientReview.controller.js';
import multer from 'multer';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';
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
  clientReviewController.createClientReview,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  uploads.single('image'),
  parseData(),
  uploadSingle('image'),
  clientReviewController.updateClientReview,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  clientReviewController.deleteClientReview,
);
router.get('/:id', clientReviewController.getClientReviewById);
router.get('/', clientReviewController.getAllClientReview);

export const clientReviewRoutes = router;
