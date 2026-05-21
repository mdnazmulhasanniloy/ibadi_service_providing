import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import sendResponse from '@app/utils/sendResponse.js';
import { verificationRequestService } from './verificationRequest.service.js';
import { VERIFICATION_STATUS } from '../../../../generated/prisma/index.js';

const createVerificationRequest = catchAsync(
  async (req: Request, res: Response) => {
    const body = {
      ...req.body,
      userId: req.user.userId,
    };
    const result =
      await verificationRequestService.createVerificationRequest(body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'VerificationRequest created successfully',
      data: result,
    });
  },
);

const getAllVerificationRequest = catchAsync(
  async (req: Request, res: Response) => {
    const result = await verificationRequestService.getAllVerificationRequest(
      req.query,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All verificationRequest fetched successfully',
      data: result,
    });
  },
);
const getMyVerificationRequest = catchAsync(
  async (req: Request, res: Response) => {
    const query = {
      ...req.query,
      userId: req.user.userId,
    };
    const result =
      await verificationRequestService.getAllVerificationRequest(query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All verificationRequest fetched successfully',
      data: result,
    });
  },
);
const getVerificationRequestById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await verificationRequestService.getVerificationRequestById(
      req.params.id as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'VerificationRequest fetched successfully',
      data: result,
    });
  },
);
const rejectVerificationRequest = catchAsync(
  async (req: Request, res: Response) => {
    const result = await verificationRequestService.updateVerificationRequest(
      req.params.id as string,
      { status: VERIFICATION_STATUS.rejected, reason: req.body.reason } as any,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'VerificationRequest updated successfully',
      data: result,
    });
  },
);
const approveVerificationRequest = catchAsync(
  async (req: Request, res: Response) => {
    const result = await verificationRequestService.approveVerificationRequest(
      req.params.id as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'VerificationRequest updated successfully',
      data: result,
    });
  },
);

const deleteVerificationRequest = catchAsync(
  async (req: Request, res: Response) => {
    const result = await verificationRequestService.deleteVerificationRequest(
      req.params.id as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'VerificationRequest deleted successfully',
      data: result,
    });
  },
);

export const verificationRequestController = {
  createVerificationRequest,
  getAllVerificationRequest,
  getMyVerificationRequest,
  getVerificationRequestById,
  approveVerificationRequest,
  deleteVerificationRequest,
  rejectVerificationRequest,
};
