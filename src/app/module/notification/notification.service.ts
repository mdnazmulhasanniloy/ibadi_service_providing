/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '@app/error/AppError.js';
import prisma from '@app/shared/prisma.js';
import httpStatus from 'http-status';

const getNotification = async (userId: string) => {
  const notification = await prisma.notification.findMany({
    where: { receiverId: userId },
    include: {  
      user: {
        select: {
          id: true,
          name: true,
          profile: true,
          phoneNumber: true,
        },
      },
    },
  });

  return notification;
};
const deleteNotification = async (userId: string) => {
  const notification = await prisma.notification.deleteMany({
    where: { receiverId: userId },
  });

  if (!notification)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Notification delete successfully.',
    );

  return notification;
};
const readNotification = async (userId: string) => {
  const notification = await prisma.notification.updateMany({
    where: { receiverId: userId },
    data: { isRead: true },
  });

  if (!notification)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Notification Read successfully.',
    );

  return notification;
};

export const notificationService = {
  deleteNotification,
  getNotification,
  readNotification,
};
