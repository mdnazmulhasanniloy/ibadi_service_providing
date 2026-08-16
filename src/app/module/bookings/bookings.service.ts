import AppError from '@app/error/AppError.js';
import prisma from '@app/shared/prisma.js';
import _ from 'lodash';
import moment from 'moment';
import httpStatus from 'http-status';
import pickQuery from '@app/utils/pickQuery.js';
import {
  BookingStatus,
  type Prisma,
} from '../../../../generated/prisma/index.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import { notificationQueue } from '@app/redis/index.js';
import StripeService from '@app/class/string.class.js';

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
    notificationQueue.add('new_notification', userNotification);
  }

  return booking;
};
/*
const getAllBookings = async (query: any) => {
  query.isDeleted = false;

  const { filters, pagination } = await pickQuery(query);

  const {
    searchTerm,
    upcoming,
    date,
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

            serviceProviderInfo: {
              select: {
                coverImage: true,
                perHourPrice: true,
                specialistsIn: {
                  select: {
                    id: true,
                    categoryId: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                        image: true,
                      },
                    },
                  },
                },
              },
            },
          },
        };
      } else if (trimmedField) {
        include[trimmedField] = true;
      }
    });
  }

  const andConditions: Prisma.BookingsWhereInput[] = [];

  // Search
  // if (searchTerm) {
  //   andConditions.push({
  //     OR: ['bookingType'].map(field => ({
  //       [field]: {
  //         contains: searchTerm,
  //         mode: 'insensitive',
  //       },
  //     })),
  //   });
  // }

  // Upcoming bookings
  if (upcoming === 'true') {
    andConditions.push({
      startDate: {
        gte: moment().toDate(),
      },
    });  
  }

  if (date) {
    andConditions.push({
      startDate: {
        gte: moment(date).toDate(),
      },
      endDate: {
        lt: moment(date).toDate(),
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
}; */
const getAllBookings = async (query: Record<string, any>) => {
  query.isDeleted = false;

  const { filters, pagination } = await pickQuery(query);

  const {
    searchTerm,
    upcoming,
    past,
    date,
    isPaid,
    include: includeData,
    ...filtersData
  } = filters;

  const ALLOWED_INCLUDES = [
    'user',
    'provider',
    'bookingDays',
    'payments',
    'notifications',
  ];

  const ALLOWED_SORT_FIELDS = [
    'createdAt',
    'updatedAt',
    'startDate',
    'endDate',
    'price',
    'status',
    'bookingType',
  ];

  const include: Prisma.BookingsInclude = {};

  if (includeData) {
    const fields = includeData.split(',');

    for (const field of fields) {
      const trimmed = field.trim();

      if (!ALLOWED_INCLUDES.includes(trimmed)) continue;

      switch (trimmed) {
        case 'user':
          include.user = {
            select: {
              id: true,
              name: true,
              email: true,
              profile: true,
              phoneNumber: true,
            },
          };
          break;

        case 'provider':
          include.provider = {
            select: {
              id: true,
              name: true,
              email: true,
              profile: true,
              phoneNumber: true,
              avgRating: true,
              totalReview: true,

              serviceProviderInfo: {
                select: {
                  bio: true,
                  coverImage: true,
                  perHourPrice: true,

                  experience: {
                    select: {
                      id: true,
                      value: true,
                    },
                  },

                  specialistsIn: {
                    select: {
                      id: true,
                      category: {
                        select: {
                          id: true,
                          name: true,
                          image: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          };
          break;

        case 'bookingDays':
          include.bookingDays = true;
          break;

        case 'payments':
          include.payments = true;
          break;

        case 'notifications':
          include.notifications = true;
          break;
      }
    }
  }

  const andConditions: Prisma.BookingsWhereInput[] = [];

  // Search
  if (searchTerm) {
    andConditions.push({
      OR: [
        {
          user: {
            is: {
              name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          provider: {
            is: {
              name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
        },
      ],
    });
  }

  const now = moment().toDate();

  // Upcoming
  if (upcoming == 'true') {
    andConditions.push({
      OR: [
        {
          startDate: {
            gte: now,
          },
        },
        // {
        //   AND: [
        //     {
        //       startDate: {
        //         lte: now,
        //       },
        //     },
        //     {
        //       OR: [
        //         {
        //           endDate: null,
        //         },
        //         {
        //           endDate: {
        //             gte: now,
        //           },
        //         },
        //       ],
        //     },
        //   ],
        // },
      ],
    });
  }

  // Past
  if (past == 'true') {
    andConditions.push({
      endDate: {
        lt: now,
      },
    });
  }

  // Date Filter
  if (date) {
    const start = moment(date).startOf('day').toDate();
    const end = moment(date).endOf('day').toDate();

    andConditions.push({
      startDate: {
        gte: start,
        lte: end,
      },
    });
  }

  if (isPaid !== undefined) {
    filtersData.isPaid = isPaid === 'true';
  }

  Object.entries(filtersData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      andConditions.push({
        [key]: {
          equals: value,
        },
      });
    }
  });

  const where: Prisma.BookingsWhereInput = {
    isDeleted: false,
    ...(andConditions.length && {
      AND: andConditions,
    }),
  };

  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  const take = Math.min(limit || 10, 100);

  let orderBy: Prisma.BookingsOrderByWithRelationInput[] = [
    {
      createdAt: 'desc',
    },
  ];

  if (sort) {
    orderBy = sort
      .split(',')
      .map(field => field.trim())
      .filter(field => {
        const name = field.startsWith('-') ? field.slice(1) : field;
        return ALLOWED_SORT_FIELDS.includes(name);
      })
      .map(field => ({
        [field.startsWith('-') ? field.slice(1) : field]: field.startsWith('-')
          ? 'desc'
          : 'asc',
      }));
  }

  try {
    const [data, total] = await Promise.all([
      prisma.bookings.findMany({
        where,
        include,
        skip,
        take,
        orderBy,
      }),

      prisma.bookings.count({
        where,
      }),
    ]);

    return {
      meta: {
        page,
        limit: take,
        total,
        totalPage: Math.ceil(total / take),
      },
      data,
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

            serviceProviderInfo: {
              select: {
                coverImage: true,
                perHourPrice: true,

                specialistsIn: {
                  select: {
                    id: true,
                    categoryId: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                        image: true,
                      },
                    },
                  },
                },
              },
            },
          },
        };
      } else if (trimmedField) {
        include[trimmedField] = true;
      }
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

const approvedRequest = async (id: String) => {
  const result = await prisma.bookings.update({
    where: {
      id: id?.toString(),
    },
    data: {
      status: BookingStatus.ongoing,
      isActive: true,
    },
  });

  if (!result) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Booking request approved failed',
    );
  }

  return result;
};

const rejectBookings = async (id: string) => {
  return await prisma.$transaction(async tx => {
    const result = await tx.bookings.update({
      where: {
        id,
      },
      data: {
        status: BookingStatus.canceled,
        isActive: false,
      },
      include: {
        payments: {
          select: {
            transactionId: true,
          },
        },
      },
    });

    if (!result) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Booking request cancel failed',
      );
    }

    const transactionId = result?.payments[0]?.transactionId;

    if (!transactionId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Payment transaction id not found',
      );
    }

    try {
      const stripe = StripeService.getStripe();

      // 🔥 Direct refund using paymentIntent (recommended)
      await stripe.refunds.create({
        payment_intent: transactionId,
      });
    } catch (error: any) {
      console.error('Refund error:', error.message);

      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Refund failed, booking not canceled',
      );
    }

    return result;
  });
};

const canceledBookings = async (id: string) => {
  const result = await prisma.bookings.update({
    where: {
      id,
    },
    data: {
      status: BookingStatus.canceled,
      isActive: false,
    },
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Booking request cancel failed');
  }

  return result;
};

const getProviderMonthlyAnalytics = async (
  providerId: string,
  month?: string,
) => {
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (month && !monthPattern.test(month)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'month must be in YYYY-MM format',
    );
  }

  const selectedMonth = month || moment().format('YYYY-MM');
  const periodStart = moment
    .parseZone(`${selectedMonth}-01T00:00:00+06:00`)
    .toDate();
  const periodEnd = moment(periodStart).add(1, 'month').toDate();
  const previousStart = moment(periodStart).subtract(1, 'month').toDate();

  const baseWhere: Prisma.BookingsWhereInput = {
    providerId,
    isDeleted: false,
  };

  const [bookings, previousBookings] = await Promise.all([
    prisma.bookings.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      select: {
        status: true,
        price: true,
        bookingType: true,
        createdAt: true,
      },
    }),
    prisma.bookings.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: previousStart, lt: periodStart },
      },
      select: { status: true },
    }),
  ]);

  const acceptedStatuses: BookingStatus[] = [
    BookingStatus.accepted,
    BookingStatus.ongoing,
    BookingStatus.complete,
  ];
  const count = (status: BookingStatus) =>
    bookings.filter(booking => booking.status === status).length;
  const acceptedBookings = bookings.filter(booking =>
    acceptedStatuses.includes(booking.status),
  );
  const previousAccepted = previousBookings.filter(booking =>
    acceptedStatuses.includes(booking.status),
  ).length;
  const totalRequests = bookings.length;
  const acceptanceRate = totalRequests
    ? Number(((acceptedBookings.length / totalRequests) * 100).toFixed(2))
    : 0;
  const previousAcceptanceRate = previousBookings.length
    ? Number(((previousAccepted / previousBookings.length) * 100).toFixed(2))
    : 0;
  const completedBookings = count(BookingStatus.complete);
  const totalBookingValue = acceptedBookings.reduce(
    (total, booking) => total + booking.price,
    0,
  );

  const daysInMonth = moment(periodStart).daysInMonth();
  const dailyRequests = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dayBookings = bookings.filter(
      booking =>
        Number(
          new Intl.DateTimeFormat('en-US', {
            day: 'numeric',
            timeZone: 'Asia/Dhaka',
          }).format(booking.createdAt),
        ) === day,
    );
    return {
      day,
      totalRequests: dayBookings.length,
      acceptedBookings: dayBookings.filter(booking =>
        acceptedStatuses.includes(booking.status),
      ).length,
    };
  });

  const percentageChange = (current: number, previous: number) => {
    if (!previous) return current ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(2));
  };

  return {
    period: {
      month: selectedMonth,
      timezone: 'Asia/Dhaka',
      start: periodStart,
      endExclusive: periodEnd,
    },
    summary: {
      totalBookingRequests: totalRequests,
      totalAcceptedBookings: acceptedBookings.length,
      acceptanceRate,
      pendingBookings:
        count(BookingStatus.pending) + count(BookingStatus.requested),
      ongoingBookings: count(BookingStatus.ongoing),
      completedBookings,
      cancelledBookings: count(BookingStatus.canceled),
      totalBookingValue: Number(totalBookingValue.toFixed(2)),
      averageAcceptedBookingValue: acceptedBookings.length
        ? Number((totalBookingValue / acceptedBookings.length).toFixed(2))
        : 0,
      completionRate: acceptedBookings.length
        ? Number(
            ((completedBookings / acceptedBookings.length) * 100).toFixed(2),
          )
        : 0,
    },
    bookingTypeBreakdown: {
      oneTime: bookings.filter(booking => booking.bookingType === 'one_time')
        .length,
      weekly: bookings.filter(booking => booking.bookingType === 'weekly')
        .length,
    },
    comparisonWithPreviousMonth: {
      totalBookingRequests: previousBookings.length,
      totalAcceptedBookings: previousAccepted,
      acceptanceRate: previousAcceptanceRate,
      requestChangePercent: percentageChange(
        totalRequests,
        previousBookings.length,
      ),
      acceptedChangePercent: percentageChange(
        acceptedBookings.length,
        previousAccepted,
      ),
      acceptanceRateChangePoints: Number(
        (acceptanceRate - previousAcceptanceRate).toFixed(2),
      ),
    },
    dailyRequests,
  };
};

export const bookingsService = {
  createBookings,
  getAllBookings,
  getBookingsById,
  updateBookings,
  approvedRequest,
  rejectBookings,
  canceledBookings,
  getProviderMonthlyAnalytics,
};
