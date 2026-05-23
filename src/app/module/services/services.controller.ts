
import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js'; 
import { servicesService } from './services.service'; 
import sendResponse from '@app/utils/sendResponse.js';



const createServices = catchAsync(async (req: Request, res: Response) => {
 const result = await servicesService.createServices(req.body);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'Services created successfully',
    data: result,
  });

});

const getAllServices = catchAsync(async (req: Request, res: Response) => {

 const result = await servicesService.getAllServices(req.query);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'All services fetched successfully',
    data: result,
  });

});

const getServicesById = catchAsync(async (req: Request, res: Response) => {
 const result = await servicesService.getServicesById(req.params.id);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'Services fetched successfully',
    data: result,
  });

});
const updateServices = catchAsync(async (req: Request, res: Response) => {
const result = await servicesService.updateServices(req.params.id, req.body);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'Services updated successfully',
    data: result,
  });

});


const deleteServices = catchAsync(async (req: Request, res: Response) => {
 const result = await servicesService.deleteServices(req.params.id);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'Services deleted successfully',
    data: result,
  });

});

export const servicesController = {
  createServices,
  getAllServices,
  getServicesById,
  updateServices,
  deleteServices,
};