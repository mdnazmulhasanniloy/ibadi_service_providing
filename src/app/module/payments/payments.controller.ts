import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import sendResponse from '@app/utils/sendResponse.js';
import { paymentsService } from './payments.service.js';

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.confirmPayment(req.query, res);
});
const autoPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.autoPayment(req.user.userId);
});
const addPaymentMethod = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.addPaymentMethod(req.user.userId, res);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment method saved successfully',
    data: result,
  });
});

const savePaymentMethod = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.savePaymentMethod(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment method saved successfully',
    data: result,
  });
});

const getCardList = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.getCardList(
    req?.params?.customerId as string,
    res,
  );
});

export const paymentsController = {
  autoPayment,
  confirmPayment,
  addPaymentMethod,
  savePaymentMethod,
  getCardList,
};
