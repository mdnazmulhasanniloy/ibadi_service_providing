/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';

//Create Function
const createClientReview = async (payload: Prisma.ClientReviewCreateInput) => {
  const result = await prisma.clientReview.create({
    data: payload,
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create clientReview');
  }
  return result;
};

/*
get all function
*/
const getAllClientReview = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.ClientReviewWhereInput = {};

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

  const orderBy: Prisma.ClientReviewOrderByWithRelationInput[] = sort
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
    const data = await prisma.clientReview.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.clientReview.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const getClientReviewById = async (id: string) => {
  try {
    const result = await prisma.clientReview.findUnique({
      where: {
        id,
      },
    });

    if (!result)
      throw new AppError(httpStatus.BAD_REQUEST, 'ClientReview not found!');

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

// update
const updateClientReview = async (
  id: string,
  payload: Prisma.ClientReviewUpdateInput,
) => {
  const result = await prisma.clientReview.update({
    where: {
      id,
    },
    data: payload,
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update ClientReview');

  return result;
};

const deleteClientReview = async (id: string) => {
  const result = await prisma.clientReview.delete({
    where: {
      id,
    },
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete clientReview');

  return result;
};

export const clientReviewService = {
  createClientReview,
  getAllClientReview,
  getClientReviewById,
  updateClientReview,
  deleteClientReview,
};
