import { Router } from 'express';
import { faqController } from './faq.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  faqController.createFaq,
);
router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  faqController.updateFaq,
);
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.supper_admin),
  faqController.deleteFaq,
);
router.get('/:id', faqController.getFaqById);
router.get('/', faqController.getAllFaq);

export const faqRoutes = router;
