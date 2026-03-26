
import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js'; 
import { workScheduleService } from './workSchedule.service.js'; 
import sendResponse from '@app/utils/sendResponse.js';



const createWorkSchedule = catchAsync(async (req: Request, res: Response) => {
 const result = await workScheduleService.createWorkSchedule(req.body);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'WorkSchedule created successfully',
    data: result,
  });

});

const getAllWorkSchedule = catchAsync(async (req: Request, res: Response) => {

 const result = await workScheduleService.getAllWorkSchedule(req.query);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'All workSchedule fetched successfully',
    data: result,
  });

});

const getWorkScheduleById = catchAsync(async (req: Request, res: Response) => {
 const result = await workScheduleService.getWorkScheduleById(req.params.id);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'WorkSchedule fetched successfully',
    data: result,
  });

});
const updateWorkSchedule = catchAsync(async (req: Request, res: Response) => {
const result = await workScheduleService.updateWorkSchedule(req.params.id, req.body);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'WorkSchedule updated successfully',
    data: result,
  });

});


const deleteWorkSchedule = catchAsync(async (req: Request, res: Response) => {
 const result = await workScheduleService.deleteWorkSchedule(req.params.id);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'WorkSchedule deleted successfully',
    data: result,
  });

});

export const workScheduleController = {
  createWorkSchedule,
  getAllWorkSchedule,
  getWorkScheduleById,
  updateWorkSchedule,
  deleteWorkSchedule,
};