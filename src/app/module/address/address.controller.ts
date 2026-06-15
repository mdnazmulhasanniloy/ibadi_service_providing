import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import sendResponse from '@app/utils/sendResponse.js';
import { addressService } from './address.service.js';

const createAddress = catchAsync(async (req: Request, res: Response) => {
  const body = {
    ...req.body,
    userId: req.user.userId,
  };
  const result = await addressService.createAddress(body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Address created successfully',
    data: result,
  });
});

const getAllAddress = catchAsync(async (req: Request, res: Response) => {
  const query = {
    ...req.query,
    userId: req?.user?.userId,
  };
  const result = await addressService.getAllAddress(query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All address fetched successfully',
    data: result,
  });
});
const getMyAddress = catchAsync(async (req: Request, res: Response) => {
  const query = { ...req.query, userId: req?.user?.userId };
  console.log(query);
  const result = await addressService.getAllAddress(query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All address fetched successfully',
    data: result,
  });
});

const getAddressById = catchAsync(async (req: Request, res: Response) => {
  const result = await addressService.getAddressById(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Address fetched successfully',
    data: result,
  });
});

const updateAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await addressService.updateAddress(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Address updated successfully',
    data: result,
  });
});

const deleteAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await addressService.deleteAddress(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Address deleted successfully',
    data: result,
  });
});

export const addressController = {
  createAddress,
  getAllAddress,
  getAddressById,
  updateAddress,
  deleteAddress,
  getMyAddress,
};
