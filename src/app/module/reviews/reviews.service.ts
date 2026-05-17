import httpStatus from 'http-status';
import { Prisma } from '../../../../generated/prisma/index.js';
import prisma from '@app/shared/prisma.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';

const createReviews = async (payload: Prisma.ReviewsCreateInput) => {
  try {
    const { orderId, ...data }: any = payload;

    const result = await prisma.$transaction(async tx => {
      // 1️⃣ Create review
      const review = await tx.reviews.create({
        data,
      });

      // 2️⃣ Calculate avg + total
      const stats = await tx.reviews.aggregate({
        where: {
          userId: data.userId,
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      });

      // 3️⃣ Update user
      await tx.user.update({
        where: { id: data.userId },
        data: {
          avgRating: stats._avg.rating || 0,
          totalReview: stats._count.rating || 0,
        },
      });

      return review;
    });

    return result;
  } catch (error: any) {
    if (
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
    where.OR = [''].map(field => ({
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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profile: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profile: true,
          },
        },
      },
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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profile: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profile: true,
          },
        },
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

const getReviewStatistics = async (userId: string) => {
  const reviews = await prisma.reviews.findMany({
    where: { userId },
    select: { rating: true },
  });

  const stats = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  reviews.forEach(review => {
    // round rating to nearest star
    let star = Math.round(review.rating);

    // safety clamp (1–5 range)
    if (star < 1) star = 1;
    if (star > 5) star = 5;

    stats[star as 1 | 2 | 3 | 4 | 5]++;
  });

  return stats;
};
export const reviewsService = {
  createReviews,
  getAllReviews,
  getReviewsById,
  updateReviews,
  deleteReviews,
  getReviewStatistics,
};
