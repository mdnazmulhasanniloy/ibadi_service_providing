import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import { clientReviewService } from './clientReview.service.js';
import sendResponse from '@app/utils/sendResponse.js';

const createClientReview = catchAsync(async (req: Request, res: Response) => {
  const result = await clientReviewService.createClientReview(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClientReview created successfully',
    data: result,
  });
});

const getAllClientReview = catchAsync(async (req: Request, res: Response) => {
  const result = await clientReviewService.getAllClientReview(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All clientReview fetched successfully',
    data: result,
  });
});

const getClientReviewById = catchAsync(async (req: Request, res: Response) => {
  const result = await clientReviewService.getClientReviewById(
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClientReview fetched successfully',
    data: result,
  });
});
const updateClientReview = catchAsync(async (req: Request, res: Response) => {
  const result = await clientReviewService.updateClientReview(
    req.params.id as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClientReview updated successfully',
    data: result,
  });
});

const deleteClientReview = catchAsync(async (req: Request, res: Response) => {
  const result = await clientReviewService.deleteClientReview(
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'ClientReview deleted successfully',
    data: result,
  });
});

export const clientReviewController = {
  createClientReview,
  getAllClientReview,
  getClientReviewById,
  updateClientReview,
  deleteClientReview,
};
