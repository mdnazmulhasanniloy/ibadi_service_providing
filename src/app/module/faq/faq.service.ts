/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';

//Create Function
const createFaq = async (payload: Prisma.FaqCreateInput) => {
  const result = await prisma.faq.create({
    data: payload,
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create faq');
  }
  return result;
};

/*
get all function
*/
const getAllFaq = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.FaqWhereInput = {};

  /*
   * enter here search input filed
   */
  if (searchTerm) {
    where.OR = ['question'].map(field => ({
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

  const orderBy: Prisma.FaqOrderByWithRelationInput[] = sort
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
    const data = await prisma.faq.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.faq.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const getFaqById = async (id: string) => {
  try {
    const result = await prisma.faq.findUnique({
      where: {
        id,
      },
    });

    if (!result) throw new AppError(httpStatus.BAD_REQUEST, 'Faq not found!');

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

// update
const updateFaq = async (id: string, payload: Prisma.FaqUpdateInput) => {
  const result = await prisma.faq.update({
    where: {
      id,
    },
    data: payload,
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Faq');

  return result;
};

const deleteFaq = async (id: string) => {
  const result = await prisma.faq.delete({
    where: {
      id,
    },
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete faq');

  return result;
};

export const faqService = {
  createFaq,
  getAllFaq,
  getFaqById,
  updateFaq,
  deleteFaq,
};
