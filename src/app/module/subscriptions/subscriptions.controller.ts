import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import { subscriptionsService } from './subscriptions.service.js';
import sendResponse from '@app/utils/sendResponse.js';

const createSubscriptions = catchAsync(async (req: Request, res: Response) => {
  const result = await subscriptionsService.createSubscriptions(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscriptions created successfully',
    data: result,
  });
});
const getFreeTrial = catchAsync(async (req: Request, res: Response) => {
  const result = await subscriptionsService.getFreeTrial(req?.user?.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscriptions created successfully',
    data: result,
  });
});

const getMySubscriptions = catchAsync(async (req: Request, res: Response) => {
  const query = { ...req.query };
  query['userId'] = req?.user?.userId;
  const result = await subscriptionsService.getAllSubscriptions(query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All subscriptions fetched successfully',
    data: result,
  });
});
const getActiveSubscriptions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await subscriptionsService.getActiveSubscriptions(
      req?.user?.userId as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All subscriptions fetched successfully',
      data: result,
    });
  },
);

const getCurrentSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const result = await subscriptionsService.getCurrentSubscription(
      req.user.userId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.hasActiveSubscription
        ? 'Current subscription fetched successfully'
        : 'No active subscription found',
      data: result,
    });
  },
);

const getAllSubscriptions = catchAsync(async (req: Request, res: Response) => {
  const result = await subscriptionsService.getAllSubscriptions(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All subscriptions fetched successfully',
    data: result,
  });
});

const getSubscriptionsById = catchAsync(async (req: Request, res: Response) => {
  const result = await subscriptionsService.getSubscriptionsById(
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscriptions fetched successfully',
    data: result,
  });
});

const updateSubscriptions = catchAsync(async (req: Request, res: Response) => {
  const result = await subscriptionsService.updateSubscriptions(
    req.params.id as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscriptions updated successfully',
    data: result,
  });
});

const deleteSubscriptions = catchAsync(async (req: Request, res: Response) => {
  const result = await subscriptionsService.deleteSubscriptions(
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscriptions deleted successfully',
    data: result,
  });
});
const manualSubscriptionUpdate = catchAsync(
  async (req: Request, res: Response) => {
    const result = await subscriptionsService.manualSubscriptionUpdate(
      req.body,
      req.user.userId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription updated successfully',
      data: result,
    });
  },
);

export const subscriptionsController = {
  createSubscriptions,
  getAllSubscriptions,
  getSubscriptionsById,
  updateSubscriptions,
  deleteSubscriptions,
  getMySubscriptions,
  getActiveSubscriptions,
  getCurrentSubscription,
  getFreeTrial,
  manualSubscriptionUpdate,
};
