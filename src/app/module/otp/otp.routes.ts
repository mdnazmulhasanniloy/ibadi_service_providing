import { Router } from 'express'; 
import { otpControllers } from './otp.controller.js';
import { resentOtpValidations } from './otp.validation.js';
import validateRequest from '@app/middleware/validateRequest.js';

const router :Router= Router();

router.post(
  '/verify-otp',
  validateRequest(resentOtpValidations.verifyOtpZodSchema),
  otpControllers.verifyOtp,
);
router.post(
  '/resend-otp',
  validateRequest(resentOtpValidations.resentOtpZodSchema),
  otpControllers.resendOtp,
);

export const otpRoutes = router;
