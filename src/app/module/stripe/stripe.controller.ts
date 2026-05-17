import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import { stripeService } from './stripe.service.js';
import sendResponse from '@app/utils/sendResponse.js';

const addStripeCard = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeService.addStripeCard(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'your add card link get successfully',
    data: result,
  });
});

//card add page ejs load.
const getStripeCardAddPage = catchAsync(async (req: Request, res: Response) => {
  res.render('addCard', {
    clientSecret: req.query.clientSecret,
    customerId: req.query.customerId,
  });
});

const saveStripeCard = catchAsync(async (req: Request, res: Response) => {
  try {
    const result = await stripeService.setupInitiate(req.body);
    return sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Payment method save successfully',
      data: result,
    });
    return res.render('successMessage', {
      title: 'Card Added Successfully',
      description:
        'Your card has been saved successfully. You can now use it for future payments.',
    });
  } catch (error: any) {
    return sendResponse(res, {
      success: false,
      statusCode: httpStatus.OK,
      message: 'Payment method save successfully',
      data: {},
    });
    return res.render('paymentError', {
      title: 'Card Save Failed',
      message: error.message || 'Failed to save card. Please try again.',
    });
  }
});

const getCardList = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeService.getCardList(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'your add card link get successfully',
    data: result,
  });
});

const deleteCard = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeService.deleteCard(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'your add card link get successfully',
    data: result,
  });
});

const setDefaultCard = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeService.setDefaultCard(
    req.params.paymentMethodId as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'your add card link get successfully',
    data: result,
  });
});

const stripLinkAccount = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeService.stripLinkAccount(req?.user?.userId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    data: result,
    message: 'Account creation URL generated successfully.',
  });
});

const refresh = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeService.refresh(
    req.params?.id as string,
    req.query,
  );

  // Remove sendResponse after res.redirect to avoid setting headers twice
  res.redirect(result);
});

const returnUrl = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeService.returnUrl(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    data: result,
    message: 'Stripe account updated successfully.',
  });
});

export const stripeController = {
  addStripeCard,
  getStripeCardAddPage,
  saveStripeCard,
  getCardList,
  deleteCard,
  setDefaultCard,
  stripLinkAccount,
  refresh,
  returnUrl,
};
