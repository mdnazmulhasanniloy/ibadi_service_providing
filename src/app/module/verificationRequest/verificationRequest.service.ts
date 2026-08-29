/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import {
  VERIFICATION_DOCUMENT_TYPE,
  VERIFICATION_STATUS,
  type Prisma,
} from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import { notificationQueue } from '@app/redis/index.js';
import _ from 'lodash';

//Create Function
// const createVerificationRequest = async (
//   payload: Prisma.VerificationRequestCreateInput,
// ) => {
//   // @ts-ignore
//   const { palliativeCare, drivingLicense, businessProfile, document, ...data } =
//     payload;

//   const images: { url: string; type: VERIFICATION_DOCUMENT_TYPE }[] = [];
//   if (palliativeCare && palliativeCare.length > 0) {
//     palliativeCare.forEach((image: any) => {
//       images.push({
//         url: image,
//         type: VERIFICATION_DOCUMENT_TYPE.palliativeCare,
//       });
//     });
//   }
//   if (drivingLicense && drivingLicense.length > 0) {
//     drivingLicense.forEach((image: any) => {
//       images.push({
//         url: image,
//         type: VERIFICATION_DOCUMENT_TYPE.drivingLicense,
//       });
//     });
//   }
//   if (businessProfile && businessProfile.length > 0) {
//     businessProfile.forEach((image: any) => {
//       images.push({
//         url: image,
//         type: VERIFICATION_DOCUMENT_TYPE.businessProfile,
//       });
//     });
//   }
//   if (document && document.length > 0) {
//     document.forEach((image: any) => {
//       images.push({
//         url: image,
//         type: VERIFICATION_DOCUMENT_TYPE.document,
//       });
//     });
//   }

//   const result = await prisma.verificationRequest.create({
//     data: {
//       ...data,
//       documents: {
//         createMany: {
//           data: images?.map(image => ({ url: image.url, type: image.type })),
//         },
//       },
//     },
//     include: {
//       documents: true,
//     },
//   });

//   if (!result) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       'Failed to create verificationRequest',
//     );
//   }

//   const admin = await prisma.user.findFirst({
//     where: {
//       role: 'admin',
//     },
//     select: {
//       id: true,
//     },
//   });
//   if (admin) {
//     const adminNotification = {
//       data: {
//         receiverId: admin.id as string,
//         message: 'New Verification Request',
//         description:
//           'A user has submitted a new verification request. Please review and take necessary action.',
//         verificationRequestId: result.id,
//       },
//     };
//     notificationQueue.add('new_notification', adminNotification);
//   }

//   return result;
// };
const createVerificationRequest = async (
  payload: Prisma.VerificationRequestCreateInput,
) => {
  // @ts-ignore
  const { palliativeCare, drivingLicense, businessProfile, document, ...data } =
    payload;

  const images: {
    url: string;
    type: VERIFICATION_DOCUMENT_TYPE;
  }[] = [];

  if (palliativeCare?.length) {
    palliativeCare.forEach((image: string) => {
      images.push({
        url: image,
        type: VERIFICATION_DOCUMENT_TYPE.palliativeCare,
      });
    });
  }

  if (drivingLicense?.length) {
    drivingLicense.forEach((image: string) => {
      images.push({
        url: image,
        type: VERIFICATION_DOCUMENT_TYPE.drivingLicense,
      });
    });
  }

  if (businessProfile?.length) {
    businessProfile.forEach((image: string) => {
      images.push({
        url: image,
        type: VERIFICATION_DOCUMENT_TYPE.businessProfile,
      });
    });
  }

  if (document?.length) {
    document.forEach((image: string) => {
      images.push({
        url: image,
        type: VERIFICATION_DOCUMENT_TYPE.document,
      });
    });
  }

  const userId = (data as any).userId;

  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User ID is required');
  }

  const existingRequest = await prisma.verificationRequest.findFirst({
    where: {
      userId,
    },
    include: {
      documents: true,
    },
  });

  let result;
  let isNewRequest = false;

  if (existingRequest) {
    result = await prisma.$transaction(async tx => {
      await tx.documents.deleteMany({
        where: {
          requestId: existingRequest.id,
        },
      });

      return tx.verificationRequest.update({
        where: {
          id: existingRequest.id,
        },
        data: {
          ...data,
          // status: VERIFICATION_STATUS.pending,

          documents: {
            create: images.map(image => ({
              url: image.url,
              type: image.type,
            })),
          },
        },
        include: {
          documents: true,
        },
      });
    });
  } else {
    // New verification request
    isNewRequest = true;

    result = await prisma.verificationRequest.create({
      data: {
        ...data,

        documents: {
          create: images.map(image => ({
            url: image.url,
            type: image.type,
          })),
        },
      },
      include: {
        documents: true,
      },
    });
  }

  if (!result) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      existingRequest
        ? 'Failed to update verification request'
        : 'Failed to create verification request',
    );
  }

  if (isNewRequest) {
    const admin = await prisma.user.findFirst({
      where: {
        role: 'admin',
      },
      select: {
        id: true,
      },
    });

    if (admin) {
      await notificationQueue.add('new_notification', {
        data: {
          receiverId: admin.id,
          message: 'New Verification Request',
          description:
            'A user has submitted a new verification request. Please review and take necessary action.',
          verificationRequestId: result.id,
        },
      });
    }
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
    select: {
      reason: true,
      user: {
        select: {
          id: true,
          fcmToken: true,
        },
      },
    },
  });

  if (!result)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to update VerificationRequest',
    );
  if (payload?.status === VERIFICATION_STATUS.rejected) {
    const notification = {
      data: {
        receiverId: result?.user?.id as string,
        message: 'Verification Rejected',
        description: `Unfortunately, your service provider verification has been rejected. Reason: ${result?.reason}`,
      },
    };
    await notificationQueue.add('new_notification', notification);
  }
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
      user: {
        select: {
          fcmToken: true,
          id: true,
        },
      },
    },
  });

  if (!result)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to update VerificationRequest',
    );

  if (result?.user) {
    const notification = {
      data: {
        receiverId: result?.user?.id as string,
        message: 'Your verification has been approved!',
        description:
          'Congratulations! Your service provider account has been successfully verified. You can now start providing your services.',
      },
    };
    await notificationQueue.add('new_notification', notification);
  }

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
