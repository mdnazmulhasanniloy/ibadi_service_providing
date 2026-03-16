import catchAsync from '@app/utils/catchAsync.js';
import { notificationService } from './notification.service.js';
import sendResponse from '@app/utils/sendResponse.js';
import httpStatus from 'http-status';
import type { Request, Response } from 'express';

const getNotification = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.getNotification(req?.user?.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'get notification successfully',
    data: result,
  });
});

const readNotification = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.readNotification(req?.user?.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Read notification successfully',
    data: result,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.deleteNotification(
    req?.user?.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Delete Notification successfully',
    data: result,
  });
});
export const notificationController = {
  getNotification,
  readNotification,
  deleteNotification,
};
