import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import sendResponse from '@app/utils/sendResponse.js';
import { othersTaskService } from './othersTaskOptions.service.js';

const createOthersTaskOptions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await othersTaskService.createOthersTask(req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'OthersTaskOptions created successfully',
      data: result,
    });
  },
);

const getAllOthersTaskOptions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await othersTaskService.getAllOthersTask(req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All othersTaskOptions fetched successfully',
      data: result,
    });
  },
);

const getOthersTaskOptionsById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await othersTaskService.getOthersTaskById(
      req.params.id as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'OthersTaskOptions fetched successfully',
      data: result,
    });
  },
);
const updateOthersTaskOptions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await othersTaskService.updateOthersTask(
      req.params.id as string,
      req.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'OthersTaskOptions updated successfully',
      data: result,
    });
  },
);

const deleteOthersTaskOptions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await othersTaskService.deleteOthersTask(
      req.params.id as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'OthersTaskOptions deleted successfully',
      data: result,
    });
  },
);

export const othersTaskOptionsController = {
  createOthersTaskOptions,
  getAllOthersTaskOptions,
  getOthersTaskOptionsById,
  updateOthersTaskOptions,
  deleteOthersTaskOptions,
};
