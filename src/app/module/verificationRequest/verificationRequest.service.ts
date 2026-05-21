/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import {
  VERIFICATION_STATUS,
  type Prisma,
} from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import { notificationQueue } from '@app/redis/index.js';

//Create Function
const createVerificationRequest = async (
  payload: Prisma.VerificationRequestCreateInput,
) => {
  // @ts-ignore
  const { images, ...data } = payload;
  const result = await prisma.verificationRequest.create({
    data: {
      ...data,
      documents: {
        createMany: {
          data: images?.map((url: string) => ({ url })),
        },
      },
    },
    include: {
      documents: true,
    },
  });

  if (!result) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to create verificationRequest',
    );
  }

  const admin = await prisma.user.findFirst({
    where: {
      role: 'admin',
    },
    select: {
      id: true,
    },
  });
  if (admin) {
    const adminNotification = {
      data: {
        receiverId: admin.id as string,
        message: 'New Verification Request',
        description:
          'A user has submitted a new verification request. Please review and take necessary action.',
        verificationRequestId: result.id,
      },
    };
    await notificationQueue.add('new_notification', adminNotification);
  }

  return result;
};

/*
get all function
*/
const getAllVerificationRequest = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.VerificationRequestWhereInput = {};

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

  const orderBy: Prisma.VerificationRequestOrderByWithRelationInput[] = sort
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
    const data = await prisma.verificationRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        documents: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            phoneNumber: true,
            serviceProviderInfo: true,
          },
        },
      },
    });

    const total = await prisma.verificationRequest.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const getVerificationRequestById = async (id: string) => {
  try {
    const result = await prisma.verificationRequest.findUnique({
      where: {
        id,
      },
      include: {
        documents: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            phoneNumber: true,
            serviceProviderInfo: true,
          },
        },
      },
    });

    if (!result)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'VerificationRequest not found!',
      );

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

// update
const updateVerificationRequest = async (
  id: string,
  payload: Prisma.VerificationRequestUpdateInput,
) => {
  const result = await prisma.verificationRequest.update({
    where: {
      id,
    },
    data: payload,
  });

  if (!result)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to update VerificationRequest',
    );

  return result;
};

const approveVerificationRequest = async (id: string) => {
  const result = await prisma.verificationRequest.update({
    where: {
      id,
    },
    data: {
      status: VERIFICATION_STATUS.verified,
      user: {
        update: {
          isVerified: true,
        },
      },
    },
    include: {
      user: true,
    },
  });

  if (!result)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to update VerificationRequest',
    );

  return result;
};

const deleteVerificationRequest = async (id: string) => {
  const result = await prisma.verificationRequest.delete({
    where: {
      id,
    },
  });

  if (!result)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to delete verificationRequest',
    );

  return result;
};

export const verificationRequestService = {
  createVerificationRequest,
  getAllVerificationRequest,
  getVerificationRequestById,
  updateVerificationRequest,
  deleteVerificationRequest,
  approveVerificationRequest,
};
