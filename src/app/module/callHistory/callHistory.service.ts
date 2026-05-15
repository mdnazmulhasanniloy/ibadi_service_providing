/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';

//Create Function
const createCallHistory = async (payload: Prisma.CallHistoryCreateInput) => {
  const result = await prisma.callHistory.create({
    data: payload,
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create callHistory');
  }
  return result;
};

/*
get all function
*/
const getAllCallHistory = async (
  query: Record<string, any>,
  userId: string,
) => {
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.CallHistoryWhereInput = {};
  // Filter conditions
  if (userId) {
    where.OR = [
      {
        receiverId: userId,
      },
      {
        senderId: userId,
      },
    ];
  }

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

  const orderBy: Prisma.CallHistoryOrderByWithRelationInput[] = sort
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
    const data = await prisma.callHistory.findMany({
      where,
      skip,
      take: limit,
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
      },
      orderBy,
    });

    const total = await prisma.callHistory.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const getCallHistoryById = async (id: string) => {
  try {
    const result = await prisma.callHistory.findUnique({
      where: {
        id,
      },
    });

    if (!result)
      throw new AppError(httpStatus.BAD_REQUEST, 'CallHistory not found!');

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const deleteCallHistory = async (id: string) => {
  const result = await prisma.callHistory.delete({
    where: {
      id,
    },
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete callHistory');

  return result;
};

export const callHistoryService = {
  createCallHistory,
  getAllCallHistory,
  getCallHistoryById,
  // updateCallHistory,
  deleteCallHistory,
};
