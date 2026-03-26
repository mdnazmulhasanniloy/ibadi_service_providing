import httpStatus from 'http-status';
import type { Prisma } from '../../../../generated/prisma/index.js';
import prisma from '@app/shared/prisma.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';

//Create Function
const createReviews = async (payload: Prisma.ReviewsCreateInput) => {
  try {
    // Use a transaction to ensure both operations succeed or fail together

    const { orderId, ...data }: any = payload;

    const [review] = await prisma.$transaction([
      prisma.reviews.create({
        data: {
          rating: data.rating,
          review: data.review,
          user: { connect: { id: data.userId } },
          // product: { connect: { id: data.productId } },
          // order: { connect: { id: orderId } },
        },
      }),
      // prisma.orders.update({
      //   where: { id: orderId },
      //   data: { isReviewed: true },
      // }),
    ]);

    // console.log(orderUpdate);

    return review;
  } catch (error: any) {
    // Catch duplicate review attempt
    if (
      //@ts-ignore
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError(httpStatus.BAD_REQUEST, 'You have already reviewed');
    }

    throw new AppError(
      httpStatus.BAD_REQUEST,
      error.message || 'Failed to create review',
    );
  }
};

/*
get all function
*/
const getAllReviews = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.ReviewsWhereInput = {};

  /*
   * enter here search input filed
   */
  if (searchTerm) {
    where.OR = [].map(field => ({
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

  const orderBy: Prisma.ReviewsOrderByWithRelationInput[] = sort
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
    const data = await prisma.reviews.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.reviews.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const getReviewsById = async (id: string) => {
  try {
    const result = await prisma.reviews.findUnique({
      where: {
        id,
      },
    });

    if (!result) throw new Error('Reviews not found!');

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

// update
const updateReviews = async (
  id: string,
  payload: Prisma.ReviewsUpdateInput,
) => {
  const result = await prisma.reviews.update({
    where: {
      id,
    },
    data: payload,
  });

  if (!result) throw new Error('Failed to update Reviews');

  return result;
};

const deleteReviews = async (id: string) => {
  const result = await prisma.reviews.delete({
    where: {
      id,
    },
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete reviews');

  return result;
};

export const reviewsService = {
  createReviews,
  getAllReviews,
  getReviewsById,
  updateReviews,
  deleteReviews,
};
