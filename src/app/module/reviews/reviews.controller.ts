import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import { reviewsService } from './reviews.service.js';
import sendResponse from '@app/utils/sendResponse.js';

const createReviews = catchAsync(async (req: Request, res: Response) => {
  const body = {
    ...req.body,
    authorId: req.user.userId,
  };

  const result = await reviewsService.createReviews(body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews created successfully',
    data: result,
  });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewsService.getAllReviews(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All reviews fetched successfully',
    data: result,
  });
});
const getReviewsByUserId = catchAsync(async (req: Request, res: Response) => {
  req.query['userId'] = req.params.userId;
  const result = await reviewsService.getAllReviews(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All reviews fetched successfully',
    data: result,
  });
});

const getReviewsById = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewsService.getReviewsById(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews fetched successfully',
    data: result,
  });
});

// const updateReviews = catchAsync(async (req: Request, res: Response) => {
//   const result = await reviewsService.updateReviews(req.params.id as string, req.body);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: 'Reviews updated successfully',
//     data: result,
//   });
// });

const deleteReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewsService.deleteReviews(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews deleted successfully',
    data: result,
  });
});

export const reviewsController = {
  createReviews,
  getAllReviews,
  getReviewsById,
  // updateReviews,
  getReviewsByUserId,
  deleteReviews,
};
