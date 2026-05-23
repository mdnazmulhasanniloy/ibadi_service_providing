/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';

//Create Function
const createServices = async (payload: Prisma.servicesCreateInput) => {
  const result = await prisma.services.create({
    data: payload,
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create services');
  }
  return result;
};

/*
get all function
*/
const getAllServices = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.servicesWhereInput = {};

  /*
   * enter here search input filed
   */
  if (searchTerm) {
    where.OR = ['name'].map(field => ({
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

  const orderBy: Prisma.servicesOrderByWithRelationInput[] = sort
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
    const data = await prisma.services.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.services.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const getServicesById = async (id: string) => {
  try {
    const result = await prisma.services.findUnique({
      where: {
        id,
      },
    });

    if (!result)
      throw new AppError(httpStatus.BAD_REQUEST, 'Services not found!');

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

// update
const updateServices = async (
  id: string,
  payload: Prisma.servicesUpdateInput,
) => {
  const result = await prisma.services.update({
    where: {
      id,
    },
    data: payload,
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Services');

  return result;
};

const deleteServices = async (id: string) => {
  const result = await prisma.services.delete({
    where: {
      id,
    },
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete services');

  return result;
};

export const servicesService = {
  createServices,
  getAllServices,
  getServicesById,
  updateServices,
  deleteServices,
};
