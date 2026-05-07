import { Router } from 'express';
import { paymentsController } from './payments.controller.js';
import auth from '@app/middleware/auth.js';
import { USER_ROLE } from '../users/user.constants.js';

const router: Router = Router();

router.get('/confirm-payment', paymentsController.confirmPayment);
router.get(
  '/auto-payment',
  auth(USER_ROLE.user),
  paymentsController.autoPayment,
);
router.post(
  '/payment-method/add',
  auth(USER_ROLE.user),
  paymentsController.addPaymentMethod,
);

router.get('/form', (req, res) => {
  res.render('addCard', {
    clientSecret: req.query.clientSecret,
    customerId: req.query.customerId,
  });
});

router.post('/payment-method/save', paymentsController.savePaymentMethod);
router.get('/payment-method/list/:customerId', paymentsController.getCardList);

export const paymentsRoutes = router;
