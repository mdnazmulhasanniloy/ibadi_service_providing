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
import pickQuery from '@app/utils/pickQuery.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';

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

/**
 * 
 *   
  userId String @db.ObjectId
  providerId   String        @db.ObjectId 
  isPaid Boolean @default(false)  
  bookingType BOOKING_TYPE @default(one_time)
  price Float
  startDate DateTime
  totalHours Float
  isActive Boolean @default(false)
  nextBooking String? @db.ObjectId

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user              User               @relation("UserBookings",    fields: [userId],    references: [id])
  provider          User               @relation("ProviderBookings",fields: [providerId],references: [id])
  bookingDays     BookingDays[]
  notifications     Notification[]
  payments     Payments[] 

 * @param query 
 * @returns 
 */
const getAllBookings = async (query: any) => {
  query.isDeleted = false;
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm,upcoming, ...filtersData } = filters;

  const where: Prisma.BookingsWhereInput = {};

  /*
   * enter here search input filed
   */
  if (searchTerm) {
    where.OR = ['bookingType'].map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    }));
  }

  if (upcoming) {
    where.AND = [{

    }]
  }

  // Filter conditions
  if (Object.keys(filtersData).length > 0) {
    const oldAnd = where.AND;
    const andArray = Array.isArray(oldAnd) ? oldAnd : oldAnd ? [oldAnd] : [];

    where.AND = [
      ...andArray,
      ...Object.entries(filtersData).map(([key, value]) => ({
        [key]: { equals: value },
      })),
    ];
  }

  // Pagination & Sorting
  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  const orderBy: Prisma.CategoriesOrderByWithRelationInput[] = sort
    ? sort.split(',').map(field => {
        const trimmed = field.trim();
        if (trimmed.startsWith('-')) {
          return { [trimmed.slice(1)]: 'desc' };
        }
        return { [trimmed]: 'asc' };
      })
    : [];

  try {
    // Fetch data
    const data = await prisma.bookings.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.bookings.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
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
