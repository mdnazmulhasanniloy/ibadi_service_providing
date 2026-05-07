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
    await stripeService.setupInitiate(req.body);

    return res.render('successMessage', {
      title: 'Card Added Successfully',
      description:
        'Your card has been saved successfully. You can now use it for future payments.',
    });
  } catch (error: any) {
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

export const stripeController = {
  addStripeCard,
  getStripeCardAddPage,
  saveStripeCard,
  getCardList,
  deleteCard,
};
