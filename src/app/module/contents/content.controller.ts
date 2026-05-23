import catchAsync from '@app/utils/catchAsync.js';
import { contentsService } from './content.service.js';
import sendResponse from '@app/utils/sendResponse.js';

const getContents = catchAsync(async (req, res) => {
  const result = await contentsService.getContents(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Contents fetched successfully',
    data: result,
  });
});

const getWebAboutUs = catchAsync(async (req, res) => {
  const result = await contentsService.getWebAboutUs(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Web about us content fetched successfully',
    data: result,
  });
});
const updateWebAboutUs = catchAsync(async (req, res) => {
  const result = await contentsService.updateWebAboutUs(
    req.params.id as string,
    req.body,
  );
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Web about us content updated successfully',
    data: result,
  });
});

const updateContents = catchAsync(async (req, res) => {
  const result = await contentsService.updateContents(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Contents updated successfully',
    data: result,
  });
});

export const contentController = {
  getContents,
  updateContents,
  getWebAboutUs,
  updateWebAboutUs,
};
