import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import sendResponse from '@app/utils/sendResponse.js';
import { paymentsService } from './payments.service.js';
import AppError from '@app/error/AppError.js';
import { verifyRevenueCatWebhook } from './payments.utils.js';

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  // const result = await paymentsService.confirmPayment();
});
const autoPayment = catchAsync(async (req: Request, res: Response) => {
  // const result = await paymentsService.autoPayment(req.user.userId);
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.getAllPayments(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment fetch successfully',
    data: result,
  });
});
const revenueCatWebHook = catchAsync(async (req: Request, res: Response) => {
  if (!verifyRevenueCatWebhook(req)) {
    throw new AppError(httpStatus?.UNAUTHORIZED, 'Unauthorized Access');
  }
  const result = await paymentsService.revenueCatWebHook(req?.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    data: result,
    message: 'payment successful',
  });
});

const getDashboardCards = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.getDashboardCards();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard Card fetch successfully',
    data: result,
  });
});

const adminDashboardChart = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.adminDashboardChart(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard Chart data fetch successfully',
    data: result,
  });
});
const createPayment = catchAsync(async (req: Request, res: Response) => {
  const body = {
    ...req.body,
    userId: req.user.userId,
  };
  const result = await paymentsService.checkout(body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'payment link get successfully',
    data: result,
  });
});

export const paymentsController = {
  autoPayment,
  confirmPayment,
  createPayment,
  getAllPayments,
  getDashboardCards,
  adminDashboardChart,
  revenueCatWebHook,
};
