/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import {
  BookingStatus,
  type Prisma,
} from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import moment from 'moment'; 

//Create Function
const createBookings = async (payload: Prisma.BookingsCreateInput) => {
  const { serviceProvider } = payload;
  const startAt = moment(payload.startAt).utc().toDate();
  const endAt = moment(payload.startAt).utc().toDate();
  // 1️⃣ Check provider exists & active
  const provider = await prisma.user.findUnique({
    where: { id: (serviceProvider as any).connect.id },
    include: {
      workSchedule: true,
    },
  });

  if (!provider) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service provider not found');
  }

  if (provider.status === 'blocked' || provider.isDeleted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Service provider not available',
    );
  }

  // 2️⃣ Check time validity
  if (new Date(startAt) >= new Date(endAt)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid time range');
  }

  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const bookingDay = daysMap[new Date(startAt).getDay()];

  const schedule = await prisma.workSchedule.findFirst({
    where: {
      userId: provider.id,
      day: bookingDay as any,
      status: true,
    },
  });
  if (!schedule) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Provider not available on this day',
    );
  }
  // check time inside schedule
  const scheduleStart = new Date(schedule.startTime);
  const scheduleEnd = new Date(schedule.endTime);

  if (new Date(startAt) < scheduleStart || new Date(endAt) > scheduleEnd) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Booking time is outside provider working hours',
    );
  }

  /// 5️⃣ Booking conflict check
  const conflictBooking = await prisma.bookings.findFirst({
    where: {
      serviceProviderId: provider?.id,
      isDeleted: false,
      status: {
        notIn: ['canceled'],
      },
      AND: [
        {
          startAt: {
            lte: endAt, // existing start < new end
          },
        },
        {
          endAt: {
            gte: startAt, // existing end > new start
          },
        },
      ],
    },
  });

  if (conflictBooking) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This time slot is already booked',
    );
  }

  const result = await prisma.bookings.create({
    data: payload,
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create bookings');
  }
  return result;
};

/*
get all function
*/
const getAllBookings = async (query: Record<string, any>) => {
  query.isDeleted = false;
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.BookingsWhereInput = {};

  /*
   * enter here search input filed
   */
  if (searchTerm) {
    where.OR = ['status'].map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    }));
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

  const orderBy: Prisma.BookingsOrderByWithRelationInput[] = sort
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
  try {
    const result = await prisma.bookings.findUnique({
      where: {
        id,
      },
    });

    if (!result || result?.isDeleted)
      throw new AppError(httpStatus.BAD_REQUEST, 'Bookings not found!');

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

// update
const updateBookings = async (
  id: string,
  payload: Prisma.BookingsUpdateInput,
) => {
  const existing = await prisma.bookings.findUnique({
    where: { id },
  });

  if (!existing || existing.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bookings not found');
  }

  const result = await prisma.bookings.update({
    where: {
      id,
    },
    data: payload,
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Bookings');

  return result;
};

/**
 *
 * @param id
 * @param status
 * @returns
 * @todo
 * need to add notification messages.
 */
const changeStatus = async (id: string, status: BookingStatus) => {
  const existing = await prisma.bookings.findUnique({ where: { id } });

  if (!existing || existing.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bookings not found');
  }

  if (existing.status === status) {
    return existing;
  }

  if (!Object.values(BookingStatus).includes(status as BookingStatus)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid booking status');
  }

  const result = await prisma.bookings.update({
    where: { id },
    data: { status: status as BookingStatus },
  });

  switch (status) {
    case BookingStatus.accepted:
      break;
    case BookingStatus.canceled:
      break;
    case BookingStatus.complete:
      break;
    case BookingStatus.confirmed:
      break;
    case BookingStatus.ongoing:
      break;
    default:
      break;
  }

  return result;
};

const deleteBookings = async (id: string) => {
  const result = await prisma.bookings.update({
    where: {
      id,
    },
    data: {
      isDeleted: true,
    },
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete bookings');

  return result;
};

export const bookingsService = {
  createBookings,
  getAllBookings,
  getBookingsById,
  updateBookings,
  changeStatus,
  deleteBookings,
};
