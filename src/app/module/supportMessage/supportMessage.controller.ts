import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import sendResponse from '@app/utils/sendResponse.js';
import { supportMessageService } from './supportMessage.service.js';

const createSupportMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await supportMessageService.createSupportMessage(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'SupportMessage created successfully',
    data: result,
  });
});

const getAllSupportMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await supportMessageService.getAllSupportMessage(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All supportMessage fetched successfully',
    data: result,
  });
});

const getSupportMessageById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await supportMessageService.getSupportMessageById(
      req.params.id as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'SupportMessage fetched successfully',
      data: result,
    });
  },
);
const updateSupportMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await supportMessageService.updateSupportMessage(
    req.params.id as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'SupportMessage updated successfully',
    data: result,
  });
});

const deleteSupportMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await supportMessageService.deleteSupportMessage(
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'SupportMessage deleted successfully',
    data: result,
  });
});

export const supportMessageController = {
  createSupportMessage,
  getAllSupportMessage,
  getSupportMessageById,
  updateSupportMessage,
  deleteSupportMessage,
};
