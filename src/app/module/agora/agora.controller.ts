import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import { agoraService } from './agora.service.js';
import sendResponse from '@app/utils/sendResponse.js';

const generateToken = catchAsync(async (req: Request, res: Response) => {
  const result = await agoraService.generateToken(
    req.params.callId as string,
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Agora token generated successfully',
    data: result,
  });
}); 
export const agoraController = {
  
  generateToken,
};
