
import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js'; 
import { experienceOptionsService } from './experienceOptions.service'; 
import sendResponse from '@app/utils/sendResponse.js';



const createExperienceOptions = catchAsync(async (req: Request, res: Response) => {
 const result = await experienceOptionsService.createExperienceOptions(req.body);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'ExperienceOptions created successfully',
    data: result,
  });

});

const getAllExperienceOptions = catchAsync(async (req: Request, res: Response) => {

 const result = await experienceOptionsService.getAllExperienceOptions(req.query);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'All experienceOptions fetched successfully',
    data: result,
  });

});

const getExperienceOptionsById = catchAsync(async (req: Request, res: Response) => {
 const result = await experienceOptionsService.getExperienceOptionsById(req.params.id);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'ExperienceOptions fetched successfully',
    data: result,
  });

});
const updateExperienceOptions = catchAsync(async (req: Request, res: Response) => {
const result = await experienceOptionsService.updateExperienceOptions(req.params.id, req.body);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'ExperienceOptions updated successfully',
    data: result,
  });

});


const deleteExperienceOptions = catchAsync(async (req: Request, res: Response) => {
 const result = await experienceOptionsService.deleteExperienceOptions(req.params.id);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'ExperienceOptions deleted successfully',
    data: result,
  });

});

export const experienceOptionsController = {
  createExperienceOptions,
  getAllExperienceOptions,
  getExperienceOptionsById,
  updateExperienceOptions,
  deleteExperienceOptions,
};