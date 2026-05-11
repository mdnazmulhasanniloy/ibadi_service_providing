/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';

//Create Function
const createExperienceOptions = async (
  payload: Prisma.ExperienceOptionsCreateInput,
) => {
  const result = await prisma.experienceOptions.create({
    data: payload,
  });

  if (!result) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to create experienceOptions',
    );
  }
  return result;
};

/*
get all function
*/
const getAllExperienceOptions = async (query: Record<string, any>) => {
  query.isDeleted = false;
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.ExperienceOptionsWhereInput = {};

  /*
   * enter here search input filed
   */
  if (searchTerm) {
    where.OR = ['value'].map(field => ({
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

  const orderBy: Prisma.ExperienceOptionsOrderByWithRelationInput[] = sort
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
    const data = await prisma.experienceOptions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.experienceOptions.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const getExperienceOptionsById = async (id: string) => {
  try {
    const result = await prisma.experienceOptions.findUnique({
      where: {
        id,
      },
    });

    if (!result || result?.isDeleted)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ExperienceOptions not found!',
      );

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

// update
const updateExperienceOptions = async (
  id: string,
  payload: Prisma.ExperienceOptionsUpdateInput,
) => {
  const result = await prisma.experienceOptions.update({
    where: {
      id,
    },
    data: payload,
  });

  if (!result)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to update ExperienceOptions',
    );

  return result;
};

const deleteExperienceOptions = async (id: string) => {
  const result = await prisma.experienceOptions.update({
    where: {
      id,
    },
    data: {
      isDeleted: true,
    },
  });

  if (!result)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to delete experienceOptions',
    );

  return result;
};

export const experienceOptionsService = {
  createExperienceOptions,
  getAllExperienceOptions,
  getExperienceOptionsById,
  updateExperienceOptions,
  deleteExperienceOptions,
};
