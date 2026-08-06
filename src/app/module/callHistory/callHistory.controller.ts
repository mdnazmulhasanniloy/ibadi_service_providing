import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import { callHistoryService } from './callHistory.service.js';
import sendResponse from '@app/utils/sendResponse.js';

const createCallHistory = catchAsync(async (req: Request, res: Response) => {
  const body = {
    ...req.body,
    senderId: req.user.userId,
  };
  const result = await callHistoryService.createCallHistory(body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'CallHistory created successfully',
    data: result,
  });
});

const getAllCallHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await callHistoryService.getAllCallHistory(
    req.query,
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All callHistory fetched successfully',
    data: result,
  });
});

const getCallHistoryById = catchAsync(async (req: Request, res: Response) => {
  const result = await callHistoryService.getCallHistoryById(
    req.params.id as string,
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'CallHistory fetched successfully',
    data: result,
  });
});

const updateCallHistory = catchAsync(async (req: Request, res: Response) => {
  // const result = await callHistoryService.updateCallHistory(
  //   req.params.id as string,
  //   req.body,
  // );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'CallHistory updated successfully',
    data: {},
  });
});

const deleteCallHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await callHistoryService.deleteCallHistory(
    req.params.id as string,
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'CallHistory deleted successfully',
    data: result,
  });
});

const acceptCall = catchAsync(async (req: Request, res: Response) => {
  const data = await callHistoryService.acceptCall(req.params.id as string, req.user.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Call accepted', data });
});

const rejectCall = catchAsync(async (req: Request, res: Response) => {
  const data = await callHistoryService.rejectCall(req.params.id as string, req.user.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Call rejected', data });
});

const cancelCall = catchAsync(async (req: Request, res: Response) => {
  const data = await callHistoryService.cancelCall(req.params.id as string, req.user.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Call cancelled', data });
});

const endCall = catchAsync(async (req: Request, res: Response) => {
  const data = await callHistoryService.endCall(req.params.id as string, req.user.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Call ended', data });
});

export const callHistoryController = {
  createCallHistory,
  getAllCallHistory,
  getCallHistoryById,
  updateCallHistory,
  deleteCallHistory,
  acceptCall,
  rejectCall,
  cancelCall,
  endCall,
};
