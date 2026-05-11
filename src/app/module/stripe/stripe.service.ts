import type { Response } from 'express';
import config from '@app/config/index.js';
import StripeService from '@app/class/string.class.js';
import prisma from '@app/shared/prisma.js';
import AppError from '@app/error/AppError.js';
import httpStatus from 'http-status';
import { resolveStripeCustomer } from '../bookings/bookings.utils.js';
import type { TCardList } from './stripe.interface.js';

//Create Function
const addStripeCard = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      customerId: true,
    },
  });
  if (!user) throw new AppError(httpStatus.BAD_REQUEST, 'User not found');

  const customerId = await resolveStripeCustomer(user);

  const setupIntent = await StripeService?.getStripe()?.setupIntents?.create({
    customer: customerId as string,
  });

  return {
    secret: setupIntent.client_secret,
    customerId,
    url: `http://103.186.20.117:1000/api/v1/stripe/payment-method/add-page?clientSecret=${setupIntent.client_secret}&customerId=${customerId}`,
  };
};

const setupInitiate = async (payload: {
  paymentMethodId: string;
  customerId: string;
}) => {
  const { paymentMethodId, customerId } = payload;

  await StripeService.getStripe().paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  return {
    success: true,
  };
};

const getCardList = async (
  userId: String,
): Promise<TCardList[] | [] | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId?.toString(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        customerId: true,
      },
    });
    if (!user) throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
    if (!user.customerId)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'stripe customer id not have.',
      );

    const customer: any = await StripeService.getCustomer(user!.customerId);


    
    // const customer =
    await StripeService.getStripe().customers.retrieve(customer.id as string);

    const paymentMethods = await StripeService.getStripe().paymentMethods.list({
      customer: customer?.id,
      type: 'card',
    });

    const cardList =
      paymentMethods?.data?.map(item => ({
        id: item.id,
        type: item.type || '',
        display_brand: item.card?.display_brand || item.card?.brand || '',
        last4digit: item.card?.last4 || '',
        exp_month: item.card?.exp_month || 0,
        exp_year: item.card?.exp_year || 0,
        funding: item.card?.funding || '',
        country: item.card?.country || '',
        fingerprint: item.card?.fingerprint || '',
        isDefault:
          customer.invoice_settings?.default_payment_method === item.id
            ? true
            : false,
      })) ?? [];

    return cardList;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const deleteCard = async (cardId: string, userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        customerId: true,
      },
    });

    if (!user) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
    }

    const customerId = await resolveStripeCustomer(user);

    // verify payment method belongs to this customer
    const paymentMethod =
      await StripeService.getStripe().paymentMethods.retrieve(cardId);

    if (paymentMethod.customer !== customerId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This card does not belong to this customer',
      );
    }

    // detach payment method
    await StripeService.getStripe().paymentMethods.detach(cardId);

    return {
      success: true,
      message: 'Card deleted successfully',
    };
  } catch (error: any) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      error?.message || 'Failed to delete card',
    );
  }
};

const setDefaultCard = async (paymentMethodId: string, userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      customerId: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  const customerId = await resolveStripeCustomer(user);

  // verify payment method belongs to this customer
  const paymentMethod =
    await StripeService.getStripe().paymentMethods.retrieve(paymentMethodId);

  if (paymentMethod.customer !== customerId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This card does not belong to this customer',
    );
  }

  // set default payment method
  await StripeService.getStripe().customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  return {
    success: true,
    message: 'Default card updated successfully',
  };
};
export const stripeService = {
  addStripeCard,
  setupInitiate,
  getCardList,
  deleteCard,
  setDefaultCard,
};
