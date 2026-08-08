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
  const graceEndsAt = moment(expiresAt).add(3, 'days').toDate();

  const result = await prisma.$transaction(async tx => {
    const subscription = await tx.subscription.create({
      data: {
        userId,
        packageId: pkg.id,
        productId: pkg.productId,
        entitlementId: 'free_trial',
        environment: 'MANUAL',
        willRenew: false,
        purchasedAt,
        expiresAt,
        graceEndsAt,
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

const getCurrentSubscription = async (userId: string) => {
  const now = new Date();

  await prisma.subscription.updateMany({
    where: {
      userId,
      isActive: true,
      OR: [
        { graceEndsAt: { lte: now } },
        { graceEndsAt: null, expiresAt: { lte: now } },
      ],
    },
    data: { isActive: false, isExpired: true },
  });

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      isActive: true,
      isPaid: true,
      isExpired: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
        { graceEndsAt: { gt: now } },
      ],
    },
    orderBy: [{ expiresAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      package: {
        select: {
          id: true,
          name: true,
          duration: true,
          productId: true,
          description: true,
          price: true,
          isRecommended: true,
        },
      },
    },
  });

  if (!subscription) {
    return {
      hasActiveSubscription: false,
      subscription: null,
    };
  }

  const fallbackPackage =
    !subscription.package && subscription.productId
      ? await prisma.packages.findFirst({
          where: { productId: subscription.productId },
          select: {
            id: true,
            name: true,
            duration: true,
            productId: true,
            description: true,
            price: true,
            isRecommended: true,
          },
        })
      : null;
  const millisecondsRemaining = subscription.expiresAt
    ? Math.max(0, subscription.expiresAt.getTime() - now.getTime())
    : null;
  const isInGracePeriod = Boolean(
    subscription.expiresAt &&
    subscription.expiresAt <= now &&
    subscription.graceEndsAt &&
    subscription.graceEndsAt > now,
  );
  const graceMillisecondsRemaining = isInGracePeriod
    ? Math.max(0, (subscription.graceEndsAt as Date).getTime() - now.getTime())
    : null;

  return {
    hasActiveSubscription: true,
    subscription: {
      id: subscription.id,
      entitlementId: subscription.entitlementId,
      productId:
        subscription.productId ||
        subscription.package?.productId ||
        fallbackPackage?.productId ||
        null,
      store: subscription.store,
      environment: subscription.environment,
      willRenew: subscription.willRenew,
      pendingProductId: subscription.pendingProductId,
      cancelReason: subscription.cancelReason,
      purchasedAt: subscription.purchasedAt,
      expiresAt: subscription.expiresAt,
      graceEndsAt: subscription.graceEndsAt,
      isInGracePeriod,
      graceDaysRemaining:
        graceMillisecondsRemaining === null
          ? null
          : Math.ceil(graceMillisecondsRemaining / (1000 * 60 * 60 * 24)),
      isPaid: subscription.isPaid,
      isActive: true,
      isExpired: false,
      daysRemaining:
        millisecondsRemaining === null
          ? null
          : Math.ceil(millisecondsRemaining / (1000 * 60 * 60 * 24)),
      package: subscription.package || fallbackPackage,
    },
  };
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

const manualSubscriptionUpdate = async (payload: any, userId: string) => {
  const packageId = payload?.packageId;
  const subscriber = payload?.payload?.subscriber;

  if (!packageId || !subscriber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'packageId and payload.subscriber are required',
    );
  }

  const entitlementEntry = Object.entries(
    subscriber.entitlements || {},
  ).find(
    ([, entitlement]) =>
      (entitlement as any)?.product_identifier === packageId,
  ) as [string, any] | undefined;

  if (!entitlementEntry) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `No entitlement found for productId: ${packageId}`,
    );
  }

  const [entitlementId, entitlementData] = entitlementEntry;
  const subscriptionData = subscriber.subscriptions?.[packageId];
  if (!subscriptionData) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `No subscription found for productId: ${packageId}`,
    );
  }

  const pkg = await prisma.packages.findFirst({
    where: { productId: packageId },
  });
  if (!pkg) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Package not found for productId: ${packageId}`,
    );
  }

  const subscriptionPayloadData = {
    packageId: pkg.id,
    trnId: subscriptionData?.store_transaction_id ?? null,
    expiresAt: entitlementData.expires_date
      ? new Date(entitlementData.expires_date)
      : null,
    graceEndsAt: entitlementData.grace_period_expires_date
      ? new Date(entitlementData.grace_period_expires_date)
      : null,
    isPaid: true,
    isActive: true,
    isExpired: false,
    entitlementId,
    productId: pkg.productId,
    store: subscriptionData?.store ?? null,
    environment: subscriptionData?.is_sandbox ? 'sandbox' : 'production',
    originalTrnId: subscriptionData?.store_transaction_id ?? null,
    willRenew: subscriptionData
      ? !subscriptionData.unsubscribe_detected_at
      : null,
    purchasedAt: entitlementData.purchase_date
      ? new Date(entitlementData.purchase_date)
      : null,
  };

  // এই user-এর আগের সব active subscription deactivate করে দেই (নতুনটা বসানোর আগে)
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      isActive: true,
      userId,
      isPaid: true,
      isExpired: false,
    },
  });

  const result = existingSubscription
    ? await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: subscriptionPayloadData,
      })
    : await prisma.subscription.create({
        data: {
          userId,
          ...subscriptionPayloadData,
        },
      });

  return result;
};

export const subscriptionsService = {
  createSubscriptions,
  getAllSubscriptions,
  getSubscriptionsById,
  updateSubscriptions,
  deleteSubscriptions,
  getActiveSubscriptions,
  getCurrentSubscription,
  getFreeTrial,
  manualSubscriptionUpdate,
};
