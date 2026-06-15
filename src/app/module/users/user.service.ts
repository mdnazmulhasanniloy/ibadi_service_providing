/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import HashPassword from '@app/shared/hashPassword.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';

import { Role, type Prisma } from '../../../../generated/prisma/index.js';

const create = async (payload: Prisma.UserCreateInput) => {
  try {
    const isExist = await prisma.user.findFirst({
      where: {
        email: payload.email,
      },
      include: {
        verification: {
          select: {
            status: true,
          },
        },
      },
    });

    payload['password'] = await HashPassword(payload?.password as string);
    if (payload.role === (Role.admin || Role.sub_admin || Role.sub_admin)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Incorrect role provided. The role must be either 'user' or 'service_provider'.",
      );
    }
    if (isExist) {
      if (isExist.isDeleted) {
        throw new AppError(httpStatus.FORBIDDEN, 'This user was deleted');
      }

      if (isExist.status === 'blocked') {
        throw new AppError(httpStatus.FORBIDDEN, 'This user was blocked');
      }

      if (!isExist.verification?.status) {
        return await prisma.user.update({
          where: { id: isExist.id },
          data: payload,
        });
      }

      throw new AppError(
        httpStatus.CONFLICT,
        'User already exists and is verified',
      );
    }
    const result = await prisma.user.create({ data: payload });

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus?.BAD_GATEWAY, error?.message);
  }
};

const getAll = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);

  const { searchTerm, ...filtersData } = filters;

  // eslint-disable-next-line prefer-const
  let pipeline: Prisma.UserWhereInput = {
    AND: {
      isDeleted: false,
    },
  };

  // search condition
  if (searchTerm) {
    pipeline.OR = ['name', 'email'].map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    }));
  }

  // Add filterQuery conditions
  if (Object.keys(filtersData).length > 0) {
    const oldAnd = pipeline.AND;
    const oldAndArray = Array.isArray(oldAnd) ? oldAnd : oldAnd ? [oldAnd] : [];

    pipeline.AND = [
      {
        isDeleted: false,
      },
      ...oldAndArray,
      ...Object.entries(filtersData).map(([key, value]) => ({
        [key]: { equals: value },
      })),
    ];
  }

  // 🚫 exclude admin users
  pipeline.NOT = {
    role: 'admin' as Role, // Cast string to enum Role
  };

  // Sorting condition
  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  let sortArray: any[] = [];
  if (sort) {
    sortArray = sort.split(',').map(field => {
      const trimmedField = field.trim();
      if (trimmedField.startsWith('-')) {
        return { [trimmedField.slice(1)]: 'desc' };
      }
      return { [trimmedField]: 'asc' };
    });
  }

  const data = await prisma.user.findMany({
    where: pipeline,
    skip,
    take: limit,
    orderBy: sortArray,
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: true,
      profile: true,
      location: true,
      bio: true,
      phoneNumber: true,
      createdAt: true,
      verification: {
        select: {
          status: true,
        },
      },
      address: true,
      workSchedule: true,
      serviceProviderInfo: {
        include: {
          images: true,
          othersRequiredTasks: {
            select: {
              othersTask: true,
            },
          },
          specialistsIn: {
            select: {
              category: true,
            },
          },
          experience: true,
        },
      },
      deviceHistory: true,
    },
  });

  const total = await prisma.user.count({
    where: pipeline,
  });

  return {
    data,
    meta: { page, limit, total },
  };
};

const getById = async (id: string) => {
  const result = await prisma.user.findUniqueOrThrow({
    where: {
      id,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      location: true,
      status: true,
      role: true,
      isVerified: true,
      profile: true,
      phoneNumber: true,
      createdAt: true,
      verification: {
        select: {
          status: true,
        },
      },
      address: true,
      workSchedule: true,
      totalReview: true,
      avgRating: true,
      serviceProviderInfo: {
        include: {
          images: true,
          othersRequiredTasks: {
            select: {
              othersTask: true,
            },
          },
          specialistsIn: {
            select: {
              category: true,
            },
          },
          experience: true,
        },
      },
      deviceHistory: true,
    },
    // include: {
    //   workSchedule: true,
    //   serviceProviderInfo: {
    //     include: {
    //       images: true,
    //     },
    //   },
    //   deviceHistory: true,
    // },
  });

  return result;
};

const update = async (id: string, payload: Prisma.UserUpdateInput) => {
  try {
    const result = await prisma.user.update({
      where: { id },
      data: payload,
      include: {
        verification: true,
        deviceHistory: true,
        workSchedule: true,
        serviceProviderInfo: {
          include: {
            experience: true,
            othersRequiredTasks: true,
            specialistsIn: true,
          },
        },
      },
    });
    return result;
  } catch (error: any) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User update failed: ' + error.message,
    );
  }
};

const serviceProfileInfo = async (userId: string, payload: any) => {
  const {
    images,
    specialistsIn,
    othersRequiredTasks,
    experienceId,

    palliativeCare,
    drivingLicense,
    businessProfiles,
    qualifiedCarer,
    coverImage,
    perHourPrice,

    ...rest
  } = payload;

  // ── helper: take first index if array ──
  const takeFirst = (value: any) => {
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }
    return value ?? null;
  };

  // ── normalize file fields ──
  const data = {
    ...rest,
    ...((perHourPrice && { perHourPrice: Number(perHourPrice) }) || {}),

    palliativeCare: takeFirst(palliativeCare),
    drivingLicense: takeFirst(drivingLicense),
    businessProfiles: takeFirst(businessProfiles),
    qualifiedCarer: takeFirst(qualifiedCarer),
    coverImage: takeFirst(coverImage),
  };

  const result = await prisma.$transaction(async tx => {
    // 1️⃣ Upsert Service Provider Info
    await tx.serviceProviderInfo.upsert({
      where: { userId },

      create: {
        userId,
        ...data,

        experience: experienceId
          ? { connect: { id: experienceId } }
          : undefined,

        images: images?.length
          ? {
              create: images.map((url: string) => ({ url })),
            }
          : undefined,
      },

      update: {
        ...data,

        experience: experienceId
          ? { connect: { id: experienceId } }
          : undefined,

        images: images?.length
          ? {
              create: images.map((url: string) => ({ url })),
            }
          : undefined,
      },
    });

    // 2️⃣ specialistsIn replace
    if (specialistsIn?.length) {
      await tx.specialistsIn.deleteMany({ where: { userId } });

      await tx.specialistsIn.createMany({
        data: specialistsIn.map((categoryId: string) => ({
          userId,
          categoryId,
        })),
      });
    }

    // 3️⃣ othersRequiredTasks replace
    if (othersRequiredTasks?.length) {
      await tx.othersRequiredTasks.deleteMany({ where: { userId } });

      await tx.othersRequiredTasks.createMany({
        data: othersRequiredTasks.map((othersTaskId: string) => ({
          userId,
          othersTaskId,
        })),
      });
    }

    // 4️⃣ return full updated profile
    return tx.serviceProviderInfo.findUnique({
      where: { userId },
      include: {
        images: true,
        experience: true,

        specialistsIn: {
          include: { category: true },
        },

        othersRequiredTasks: {
          include: { othersTask: true },
        },
      },
    });
  });

  return result;
};
const deleteUser = async (id: string) => {
  const result = await prisma.user.update({
    where: {
      id,
    },
    data: { isDeleted: true },
  });

  return result;
};
export const userService = {
  create,
  update,
  getAll,
  getById,
  deleteUser,
  serviceProfileInfo,
};
