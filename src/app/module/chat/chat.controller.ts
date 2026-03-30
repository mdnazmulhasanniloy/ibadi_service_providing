import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import sendResponse from '@app/utils/sendResponse.js';
import { chatService } from './chat.service.js';

const acceptChat = catchAsync(async (req: Request, res: Response) => {
  const result = await chatService.update(req.params.id as string, {
    status: 'accepted',
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Chat updated successfully',
    data: result,
  });
});

const blockChat = catchAsync(async (req: Request, res: Response) => {
  const result = await chatService.update(req.params.id as string, {
    status: 'blocked',
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Chat updated successfully',
    data: result,
  });
});

export const chatController = {
  acceptChat,
  blockChat,
};
