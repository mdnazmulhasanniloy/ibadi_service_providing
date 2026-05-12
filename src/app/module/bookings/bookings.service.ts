import AppError from '@app/error/AppError.js';
import prisma from '@app/shared/prisma.js';
import _ from 'lodash';
import moment from 'moment';
import httpStatus from 'http-status';
import pickQuery from '@app/utils/pickQuery.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import { notificationQueue } from '@app/redis/index.js';

const createBookings = async (payload: any) => {
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
      status: payload.status,
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

  if (booking.providerId) {
    const userNotification = {
      data: {
        receiverId: booking.providerId as string,
        message: 'You have a new booking request',
        description:
          'A customer has submitted a booking request for your service. Please check the details and take action.',
        bookingId: booking.id,
      },
    };
    await notificationQueue.add('new_notification', userNotification);
  }

  return booking;

  // 3. Compute commission split
  // const adminAmount = toFixed2(
  //   ((contents?.adminCommotions ?? 5) * booking.price) / 100,
  // );
  // const providerAmount = toFixed2(booking.price - adminAmount);

  // // 4. Create payment record + resolve Stripe customer (independent, run in parallel)
  // const [payment, customerId] = await Promise.all([
  //   prisma.payments.create({
  //     data: {
  //       userId: payload.userId,
  //       providerId: payload.providerId,
  //       bookingId: booking.id,
  //       transactionId: generateCryptoString(10),
  //       amount: booking.price,
  //       nextPaymentDate: moment(booking.startDate).add(1, 'weeks').toDate(),
  //       adminParentage: adminAmount,
  //       providerParentage: providerAmount,
  //     },
  //   }),
  //   resolveStripeCustomer(user),
  // ]);

  // // 5. Create Stripe checkout session
  // const baseUrl = `${config.server_url}/payments/confirm-payment`;
  // const redirectUrl = `${baseUrl}?sessionId={CHECKOUT_SESSION_ID}&paymentId=${payment.id}`;

  // const checkoutSession = await StripeService.getCheckoutSession(
  //   { amount: payment.amount, name: 'Service Provider Booking', quantity: 1 },
  //   redirectUrl, // success_url
  //   redirectUrl, // cancel_url (same as original)
  //   customerId,
  // );

  // if (!checkoutSession?.url)
  //   throw new AppError(
  //     httpStatus.BAD_REQUEST,
  //     'Failed to create checkout session',
  //   );

  // return checkoutSession.url;
};

const getAllBookings = async (query: any) => {
  query.isDeleted = false;

  const { filters, pagination } = await pickQuery(query);

  const {
    searchTerm,
    upcoming,
    past,
    isPaid,
    include: includeData,
    ...filtersData
  } = filters;

  // Dynamic include
  const include: Record<string, any> = {};

  if (includeData) {
    const fields = includeData.split(',');

    fields.forEach((field: string) => {
      const trimmedField = field.trim();

      if (trimmedField === 'user') {
        include.user = {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            phoneNumber: true,
          },
        };
      } else if (trimmedField === 'provider') {
        include.provider = {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            phoneNumber: true,
          },
        };
      } else if (trimmedField) {
        include[trimmedField] = true;
      }
    });
  }

  const andConditions: Prisma.BookingsWhereInput[] = [];

  // Search
  if (searchTerm) {
    andConditions.push({
      OR: ['bookingType'].map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  // Upcoming bookings
  if (upcoming === 'true') {
    andConditions.push({
      startDate: {
        gte: moment().toDate(),
      },
    });
  }

  // Past bookings
  if (past === 'true') {
    andConditions.push({
      endDate: {
        lt: moment().toDate(),
      },
    });
  }

  // Paid filter
  if (isPaid !== undefined) {
    filtersData.isPaid = isPaid === 'true';
  }

  // Dynamic filters
  if (Object.keys(filtersData).length > 0) {
    Object.entries(filtersData).forEach(([key, value]) => {
      andConditions.push({
        [key]: {
          equals: value,
        },
      });
    });
  }

  // Final where
  const where: Prisma.BookingsWhereInput = {
    AND: andConditions,
  };

  // Pagination
  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  // Sorting
  const orderBy = sort
    ? sort.split(',').map((field: string) => {
        const trimmed = field.trim();

        if (trimmed.startsWith('-')) {
          return {
            [trimmed.slice(1)]: 'desc',
          };
        }

        return {
          [trimmed]: 'asc',
        };
      })
    : [{ createdAt: 'desc' }];

  try {
    const data = await prisma.bookings.findMany({
      where,
      skip,
      take: limit,
      include,
      orderBy,
    });

    const total = await prisma.bookings.count({
      where,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
      },
    };
  } catch (error: any) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      error?.message || 'Failed to fetch bookings',
    );
  }
};

const getBookingsById = async (id: string, includeData: string) => {
  const include: { [key: string]: boolean | Object } = {};
  if (includeData) {
    const fields = includeData.split(',');
    fields.forEach((field: string) => {
      if (field.trim()) include[field.trim()] = true;
    });
  }
  const booking = await prisma.bookings.findUnique({
    where: { id },
    include,
  });

  if (!booking) throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');

  return booking;
};

const updateBookings = async (id: string, payload: any) => {
  const { bookingDays, ...bookingData } = payload;

  const result = await prisma.bookings.update({
    where: {
      id,
    },

    data: {
      ...bookingData,

      ...(bookingDays && {
        bookingDays: {
          update: bookingDays.map((day: any) => ({
            where: {
              id: day.id,
            },

            data: {
              status: day.status,
            },
          })),
        },
      }),
    },

    include: {
      bookingDays: true,
    },
  });

  return result;
};

export const bookingsService = {
  createBookings,
  getAllBookings,
  getBookingsById,
  updateBookings,
};
