/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import crypto from 'crypto';
import { pubClient } from '@app/redis/index.js';

type CreateCallPayload = {
  senderId: string;
  receiverId: string;
  type?: 'audio_call' | 'video_call';
};

const emitToUser = async (userId: string, event: string, data: unknown) => {
  const socketId = await pubClient.hGet('userId_to_socketId', userId);
  if (socketId && global.socketio)
    global.socketio.to(socketId).emit(event, data);
};

//Create Function
const createCallHistory = async (payload: CreateCallPayload) => {
  if (payload.senderId === payload.receiverId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot call yourself');
  }
  const receiver = await prisma.user.findFirst({
    where: { id: payload.receiverId, isDeleted: false, status: 'active' },
  });
  if (!receiver) throw new AppError(httpStatus.NOT_FOUND, 'Receiver not found');

  const busyCall = await prisma.callHistory.findFirst({
    where: {
      status: { in: ['ringing', 'accepted'] },
      OR: [
        { senderId: payload.senderId },
        { receiverId: payload.senderId },
        { senderId: payload.receiverId },
        { receiverId: payload.receiverId },
      ],
    },
  });
  if (busyCall) throw new AppError(httpStatus.CONFLICT, 'User is busy');

  const result = await prisma.callHistory.create({
    data: {
      senderId: payload.senderId,
      receiverId: payload.receiverId,
      type: payload.type || 'audio_call',
      channelName: `call_${crypto.randomBytes(18).toString('hex')}`,
    },
    include: {
      sender: { select: { id: true, name: true, profile: true } },
      receiver: { select: { id: true, name: true, profile: true } },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create callHistory');
  }

  await emitToUser(payload.receiverId, 'call:incoming', result);
  return result;
};

const acceptCall = async (id: string, userId: string) => {
  console.log(id, userId);
  const result = await prisma.callHistory.updateMany({
    where: { id, receiverId: userId, status: 'ringing' },
    data: { status: 'accepted', answeredAt: new Date() },
  });
  if (!result.count)
    throw new AppError(httpStatus.CONFLICT, 'Call cannot be accepted');
  console.log(result);
  const call = await getParticipantCall(id, userId);
  await emitToUser(call.senderId, 'call:accepted', call);
  return call;
};

const rejectCall = async (id: string, userId: string) => {
  const now = new Date();
  const result = await prisma.callHistory.updateMany({
    where: { id, receiverId: userId, status: 'ringing' },
    data: { status: 'rejected', endedAt: now, duration: 0 },
  });
  if (!result.count)
    throw new AppError(httpStatus.CONFLICT, 'Call cannot be rejected');
  const call = await getParticipantCall(id, userId);
  await emitToUser(call.senderId, 'call:rejected', call);
  return call;
};

const cancelCall = async (id: string, userId: string) => {
  const result = await prisma.callHistory.updateMany({
    where: { id, senderId: userId, status: 'ringing' },
    data: { status: 'cancelled', endedAt: new Date(), duration: 0 },
  });
  if (!result.count)
    throw new AppError(httpStatus.CONFLICT, 'Call cannot be cancelled');
  const call = await getParticipantCall(id, userId);
  await emitToUser(call.receiverId, 'call:cancelled', call);
  return call;
};

const endCall = async (id: string, userId: string) => {
  const call = await getParticipantCall(id, userId);
  if (call.status !== 'accepted') {
    throw new AppError(httpStatus.CONFLICT, 'Call is not active');
  }
  const endedAt = new Date();
  const duration = Math.max(
    0,
    Math.floor(
      (endedAt.getTime() - (call.answeredAt || call.startedAt).getTime()) /
        1000,
    ),
  );
  const updated = await prisma.callHistory.update({
    where: { id },
    data: { status: 'completed', endedAt, duration },
  });
  const otherUserId =
    call.senderId === userId ? call.receiverId : call.senderId;
  await emitToUser(otherUserId, 'call:ended', updated);
  return updated;
};

async function getParticipantCall(id: string, userId: string) {
  const call = await prisma.callHistory.findFirst({
    where: { id, OR: [{ senderId: userId }, { receiverId: userId }] },
  });
  if (!call) throw new AppError(httpStatus.NOT_FOUND, 'Call not found');
  return call;
}

/*
get all function
*/
const getAllCallHistory = async (
  query: Record<string, any>,
  userId: string,
) => {
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.CallHistoryWhereInput = {};
  // Filter conditions
  if (userId) {
    where.OR = [
      {
        receiverId: userId,
      },
      {
        senderId: userId,
      },
    ];
  }

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

  const orderBy: Prisma.CallHistoryOrderByWithRelationInput[] = sort
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
    const data = await prisma.callHistory.findMany({
      where,
      skip,
      take: limit,
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
      },
      orderBy,
    });

    const total = await prisma.callHistory.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const getCallHistoryById = async (id: string, userId: string) => {
  try {
    const result = await getParticipantCall(id, userId);

    if (!result)
      throw new AppError(httpStatus.BAD_REQUEST, 'CallHistory not found!');

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const deleteCallHistory = async (id: string, userId: string) => {
  await getParticipantCall(id, userId);
  const result = await prisma.callHistory.delete({ where: { id } });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete callHistory');

  return result;
};

export const callHistoryService = {
  createCallHistory,
  acceptCall,
  rejectCall,
  cancelCall,
  endCall,
  getAllCallHistory,
  getCallHistoryById,
  // updateCallHistory,
  deleteCallHistory,
};
