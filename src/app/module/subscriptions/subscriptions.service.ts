import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import moment from 'moment';

//Create Function
const createSubscriptions = async (payload: Prisma.SubscriptionCreateInput) => {
  const result = await prisma.subscription.create({
    data: payload,
  });

  if (!result) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to create subscriptions',
    );
  }
  return result;
};

const getFreeTrial = async (userId: string) => {
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      isActive: true,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (activeSubscription) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You already have an active subscription.',
    );
  }

  const user = await prisma.serviceProviderInfo.findUnique({
    where: {
      userId,
    },
    select: {
      userId: true,
      hasUsedFreeTrial: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.FORBIDDEN, 'Invalid user.');
  }

  if (user.hasUsedFreeTrial) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have already used your free trial.',
    );
  }

  const pkg = await prisma.packages.findFirst({
    where: {
      // id: packageId,
      productId: 'free_trial',
    },
  });

  if (!pkg) {
    throw new AppError(httpStatus.NOT_FOUND, 'Package not found.');
  }

  const purchasedAt = moment.utc().toDate();
  const expiresAt = moment.utc().add(Number(pkg.duration), 'days').toDate();

  const result = await prisma.$transaction(async tx => {
    const subscription = await tx.subscription.create({
      data: {
        userId,
        packageId: pkg.id,
        purchasedAt,
        expiresAt,
        isPaid: true,
        isActive: true,
      },
    });

    await tx.serviceProviderInfo.update({
      where: {
        userId,
      },
      data: {
        hasUsedFreeTrial: true,
      },
    });

    return subscription;
  });

  return result;
};

/*
get all function
*/
const getAllSubscriptions = async (query: Record<string, any>) => {
  query.isDeleted = false;
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.SubscriptionWhereInput = {};

  if (searchTerm) {
    where.OR = ['productId', 'trnId'].map(field => ({
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

  const orderBy: Prisma.SubscriptionOrderByWithRelationInput[] = sort
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
    const data = await prisma.subscription.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.subscription.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const getSubscriptionsById = async (id: string) => {
  try {
    const result = await prisma.subscription.findUnique({
      where: {
        id,
      },
    });

    if (!result)
      throw new AppError(httpStatus.BAD_REQUEST, 'Subscriptions not found!');

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};
const getActiveSubscriptions = async (id: string) => {
  try {
    const result = await prisma.subscription.findFirst({
      where: {
        userId: id,
        isActive: true,
        isPaid: true,
        expiresAt: {
          gte: moment.utc().toDate(),
        },
      },
    });

    if (!result)
      throw new AppError(httpStatus.BAD_REQUEST, 'Subscriptions not found!');

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

// update
const updateSubscriptions = async (
  id: string,
  payload: Prisma.SubscriptionUpdateInput,
) => {
  const result = await prisma.subscription.update({
    where: {
      id,
    },
    data: payload,
  });

  if (!result)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to update Subscriptions',
    );

  return result;
};

const deleteSubscriptions = async (id: string) => {
  const result = await prisma.subscription.delete({
    where: {
      id,
    },
  });

  if (!result)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to delete subscriptions',
    );

  return result;
};

export const subscriptionsService = {
  createSubscriptions,
  getAllSubscriptions,
  getSubscriptionsById,
  updateSubscriptions,
  deleteSubscriptions,
  getActiveSubscriptions,
  getFreeTrial,
};
