import { Router } from 'express';
import { addressController } from './address.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';
import validateRequest from '@app/middleware/validateRequest.js';
import { AddressValidation } from './address.validation.js';

const router: Router = Router();

router.post(
  '/',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  validateRequest(AddressValidation.create),
  addressController.createAddress,
);
router.patch(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  validateRequest(AddressValidation.update),
  addressController.updateAddress,
);
router.delete(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.service_provider),
  addressController.deleteAddress,
);
router.get('/:id', addressController.getAddressById);
router.get('/', addressController.getMyAddress);

export const addressRoutes = router;
