import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import sendResponse from '@app/utils/sendResponse.js';
import { faqService } from './faq.service.js';

const createFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await faqService.createFaq(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Faq created successfully',
    data: result,
  });
});

const getAllFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await faqService.getAllFaq(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All faq fetched successfully',
    data: result,
  });
});

const getFaqById = catchAsync(async (req: Request, res: Response) => {
  const result = await faqService.getFaqById(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Faq fetched successfully',
    data: result,
  });
});
const updateFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await faqService.updateFaq(req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Faq updated successfully',
    data: result,
  });
});

const deleteFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await faqService.deleteFaq(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Faq deleted successfully',
    data: result,
  });
});

export const faqController = {
  createFaq,
  getAllFaq,
  getFaqById,
  updateFaq,
  deleteFaq,
};
