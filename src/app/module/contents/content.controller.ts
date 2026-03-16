 
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
const updateContents = catchAsync(async (req, res) => {
  const result = await contentsService.updateContents(
    req.params.id as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Contents fetched successfully',
    data: result,
  });
});

export const contentController = {
  getContents,
  updateContents,
};
