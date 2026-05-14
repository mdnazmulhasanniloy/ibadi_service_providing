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

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.getAllPayments(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment fetch successfully',
    data: result,
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

export const paymentsController = {
  autoPayment,
  confirmPayment,  
  getAllPayments,
  getDashboardCards,
  adminDashboardChart,
};
