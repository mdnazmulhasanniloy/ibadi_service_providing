import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import sendResponse from '@app/utils/sendResponse.js';
import { homepageService } from './homepage.service.js';

const getAllHomepage = catchAsync(async (req: Request, res: Response) => {
  const result = await homepageService.getAllHomepage(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Homepage created successfully',
    data: result,
  });
});

export const homepageController = {
  getAllHomepage,
};
