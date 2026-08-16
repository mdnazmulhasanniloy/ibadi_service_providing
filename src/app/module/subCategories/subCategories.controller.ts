
import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js'; 
import { subCategoriesService } from './subCategories.service.js'; 
import sendResponse from '@app/utils/sendResponse.js';



const createSubCategories = catchAsync(async (req: Request, res: Response) => {
 const result = await subCategoriesService.createSubCategories(req.body);
  sendResponse(res, {
   statusCode: httpStatus.CREATED,
    success: true,
    message: 'SubCategories created successfully',
    data: result,
  });

});

const getAllSubCategories = catchAsync(async (req: Request, res: Response) => {

 const result = await subCategoriesService.getAllSubCategories(req.query);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'All subCategories fetched successfully',
    data: result,
  });

});

const getSubCategoriesById = catchAsync(async (req: Request, res: Response) => {
 const result = await subCategoriesService.getSubCategoriesById(req.params.id as string);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'SubCategories fetched successfully',
    data: result,
  });

});
const updateSubCategories = catchAsync(async (req: Request, res: Response) => {
const result = await subCategoriesService.updateSubCategories(req.params.id as string, req.body);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'SubCategories updated successfully',
    data: result,
  });

});


const deleteSubCategories = catchAsync(async (req: Request, res: Response) => {
 const result = await subCategoriesService.deleteSubCategories(req.params.id as string);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'SubCategories deleted successfully',
    data: result,
  });

});

export const subCategoriesController = {
  createSubCategories,
  getAllSubCategories,
  getSubCategoriesById,
  updateSubCategories,
  deleteSubCategories,
};
