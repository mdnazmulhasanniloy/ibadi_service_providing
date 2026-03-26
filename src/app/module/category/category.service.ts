/* eslint-disable @typescript-eslint/no-explicit-any */ 
import httpStatus from 'http-status'; 
import type { Prisma } from '../../../../generated/prisma/index.js';
import prisma from '@app/shared/prisma.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import { deleteFromS3 } from '@app/utils/s3.js';

//Create Function
const createCategory = async (payload: Prisma.CategoriesCreateInput) => {
  const isExist = await prisma.categories.findFirst({
    where: {
      name: payload.name,
    },
  });

  if (isExist && !isExist.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Category already exists');
  }

  if (isExist && isExist.isDeleted) {
    const result = await prisma.categories.update({
      where: {
        id: isExist.id,
      },
      data: {
        ...payload,
        isDeleted: false,
      },
    });
    return result;
  }

  const result = await prisma.categories.create({
    data: payload,
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create category');
  }

  return result;
};

/*
get all function
*/
const getAllCategory = async (query: Record<string, any>) => {
  query.isDeleted = false;
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.CategoriesWhereInput = {};

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
    const data = await prisma.categories.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.categories.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const getCategoryById = async (id: string) => {
  try {
    const result = await prisma.categories.findUnique({
      where: {
        id,
      },
    });

    if (!result || result.isDeleted)
      throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

// update
const updateCategory = async (
  id: string,
  payload: Prisma.CategoriesUpdateInput,
) => {
  const oldCategory = await getCategoryById(id);
  let path;
  if (oldCategory?.image && payload.image) {
    path = new URL(oldCategory?.image as string).pathname;
  }
  const result = await prisma.categories.update({
    where: {
      id,
    },
    data: payload,
  });

  if (!result) throw new Error('Failed to update Category');

  if (path && payload.image) {
    await deleteFromS3(path);
  }
  return result;
};

const deleteCategory = async (id: string) => {
  const result = await prisma.categories.update({
    where: {
      id,
    },
    data: {
      isDeleted: true,
    },
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete category');
  if (result.image) {
    const path = new URL(result.image as string).pathname;
    await deleteFromS3(path);
  }
  return result;
};




export const categoryService = {
  createCategory,
  getAllCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
  
};
