/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '@app/error/AppError.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import prisma from '@app/shared/prisma.js';
import pickQuery from '@app/utils/pickQuery.js';
import httpStatus from 'http-status';
import type { Prisma } from '../../../../generated/prisma/index.js';

// ======================================================
// 🔥 Create Favorites
// ======================================================
const createFavorites = async (payload: any) => {
  const isExist = await prisma.favorites.findFirst({
    where: {
      userId: payload.userId,
      serviceProviderId: payload.serviceProviderId,
    },
  });

  if (isExist) {
    const result = await prisma.favorites.delete({
      where: {
        id: isExist.id,
      },
    });

    return result;
  }

  const result = await prisma.favorites.create({
    data: {
      userId: payload.userId,
      serviceProviderId: payload.serviceProviderId,
    },
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create favorites');
  }

  return result;
};

// ======================================================
// 🔥 Get All Favorites (with caching)
// ======================================================
const getAllFavorites = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, include: includeData, ...filtersData } = filters;
  const include: { [key: string]: boolean | Object } = {};
  console.log(includeData, 'includeData');

  const where: Prisma.FavoritesWhereInput = {};

  // 🔍 Search
  // if (searchTerm) {
  //   where.OR = ['name'].map(field => ({
  //     [field]: {
  //       contains: searchTerm,
  //       mode: 'insensitive',
  //     },
  //   }));
  // }

  // 🎯 Filters
  if (Object.keys(filtersData).length > 0) {
    where.AND = Object.entries(filtersData).map(([key, value]) => ({
      [key]: { equals: value },
    }));
  }
  if (includeData) {
    const fields = includeData.split(',');

    fields.forEach((field: string) => {
      const trimmedField = field.trim();

      if (!trimmedField) return;

      if (trimmedField === 'serviceProvider') {
        include.serviceProvider = {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                bio: true,
                profile: true,
                phoneNumber: true,
                isVerified: true,
                avgRating: true,
                totalReview: true,
                status: true,
              },
            },

            experience: true,
            images: true,
            specialistsIn: {
              include: {
                category: true,
              },
            },
            providerSubcategories: {
              include: {
                subcategory: true,
              },
            },
            othersRequiredTasks: {
              include: {
                othersTask: true,
              },
            },
          },
        };
      } else if (trimmedField === 'user') {
        include.user = {
          select: {
            id: true,
            name: true,
            email: true,
            bio: true,
            profile: true,
            phoneNumber: true,
            isVerified: true,
          },
        };
      } else {
        include[trimmedField] = true;
      }
    });
  }
  // if (includeData) {
  //   const fields = includeData.split(',');

  //   fields.forEach((field: string) => {
  //     const trimmedField = field.trim();

  //     if (trimmedField === 'serviceProvider') {
  //       include[trimmedField] = {
  //         include: {
  //           user: {
  //             include: {
  //               bio: true,
  //               name: true,
  //               email: true,
  //               profile: true,
  //               isVerified: true,
  //               phoneNumber: true,
  //             },
  //           },
  //         },
  //       };
  //     } else if (trimmedField) {
  //       include[trimmedField] = true;
  //     }
  //   });

  //   fields.forEach((field: string) => {
  //     if (field.trim()) include[field.trim()] = true;
  //   });
  // }

  // 📄 Pagination
  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  // 🔃 Sorting
  // const orderBy = sort
  //   ? sort.split(',').map(field => {
  //       const trimmed = field.trim();
  //       return trimmed.startsWith('-')
  //         ? { [trimmed.slice(1)]: 'desc' }
  //         : { [trimmed]: 'asc' };
  //     })
  //   : [];

  // 📦 Query DB
  const data = await prisma.favorites.findMany({
    where,
    skip,
    take: limit,
    include,
    // orderBy,
  });

  const total = await prisma.favorites.count({ where });

  const result = {
    data,
    meta: { page, limit, total },
  };

  return result;
};

// ======================================================
// 🔥 Get Favorites By ID (with caching)
// ======================================================
const getFavoritesById = async (id: string, includeData?: any) => {
  const include: { [key: string]: boolean } = {};
  if (includeData) {
    const fields = includeData.split(',');

    fields.forEach((field: string) => {
      if (field.trim()) include[field.trim()] = true;
    });
  }
  const result = await prisma.favorites.findUnique({
    where: { id },
    include,
  });

  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Favorites not found');
  }

  return result;
};

// ======================================================
// 🔥 Update Favorites
// ======================================================
const updateFavorites = async (
  id: string,
  payload: Prisma.FavoritesUpdateInput,
) => {
  const result = await prisma.favorites.update({
    where: { id },
    data: payload,
  });

  return result;
};

// ======================================================
// 🔥 Delete Favorites
// ======================================================
const deleteFavorites = async (id: string) => {
  const result = await prisma.favorites.delete({
    where: { id },
  });

  return result;
};

// ======================================================
// 🔥 Export Service
// ======================================================
export const favoritesService = {
  createFavorites,
  getAllFavorites,
  getFavoritesById,
  updateFavorites,
  deleteFavorites,
};
