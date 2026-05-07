import AppError from '@app/error/AppError.js';
import prisma from '@app/shared/prisma.js';
import _ from 'lodash';
import moment from 'moment';
import httpStatus from 'http-status';
import { toFixed2 } from './bookings.constants.js';
import StripeService from '@app/class/string.class.js';
import config from '@app/config/index.js';
import { resolveStripeCustomer } from './bookings.utils.js';
import generateCryptoString from '@app/utils/generateCryptoString.js';

const createBookings = async (payload: any): Promise<string> => {
  // 1. Validate user early — before writing any records
  const [user, contents] = await Promise.all([
    prisma.user.findUnique({ where: { id: payload.userId } }),
    prisma.contents.findFirst({ where: { type: 'main' } }),
  ]);

  if (!user)
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found for booking');

  // 2. Create booking
  const booking = await prisma.bookings.create({
    data: {
      userId: payload.userId,
      providerId: payload.providerId,
      price: payload.price,
      startDate: moment(payload.startDate).toDate(),
      totalHours: payload.totalHours,
      bookingType: payload.bookingType,

      bookingDays: {
        create: payload.bookingDays.map((item: any) => ({
          day: item.day,
          startTime: moment(item.startTime).toDate(),
          endTime: moment(item.endTime).toDate(),
          durationHours: item.durationHours,
        })),
      },
    },
    include: { bookingDays: true },
  });

  // 3. Compute commission split
  const adminAmount = toFixed2(
    ((contents?.adminCommotions ?? 5) * booking.price) / 100,
  );
  const providerAmount = toFixed2(booking.price - adminAmount);

  // 4. Create payment record + resolve Stripe customer (independent, run in parallel)
  const [payment, customerId] = await Promise.all([
    prisma.payments.create({
      data: {
        userId: payload.userId,
        providerId: payload.providerId,
        bookingId: booking.id,
        transactionId: generateCryptoString(10),
        amount: booking.price,
        nextPaymentDate: moment(booking.startDate).add(1, 'weeks').toDate(),
        adminParentage: adminAmount,
        providerParentage: providerAmount,
      },
    }),
    resolveStripeCustomer(user),
  ]);

  // 5. Create Stripe checkout session
  const baseUrl = `${config.server_url}/payments/confirm-payment`;
  const redirectUrl = `${baseUrl}?sessionId={CHECKOUT_SESSION_ID}&paymentId=${payment.id}`;

  const checkoutSession = await StripeService.getCheckoutSession(
    { amount: payment.amount, name: 'Service Provider Booking', quantity: 1 },
    redirectUrl, // success_url
    redirectUrl, // cancel_url (same as original)
    customerId,
  );

  if (!checkoutSession?.url)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to create checkout session',
    );

  return checkoutSession.url;
};

const getAllBookings = async (query: any) => {
  const bookings = await prisma.bookings.findMany({
    where: {
      userId: query.userId,
    },
    include: {
      bookingDays: true,
    },
  });

  return bookings;
};

const getBookingsById = async (id: string) => {
  const booking = await prisma.bookings.findUnique({
    where: { id },
    include: {
      bookingDays: true,
    },
  });

  if (!booking) throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');

  return booking;
};

export const bookingsService = {
  createBookings,
};
