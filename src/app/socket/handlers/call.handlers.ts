import prisma from '@app/shared/prisma.js';
import callbackFn from '@app/utils/callbackFn.js';
import type { tryCatch } from 'bullmq';
import { Server } from 'socket.io';
import type { CALL_TYPE } from '../../../../generated/prisma/index.js';
import generateCryptoString from '@app/utils/generateCryptoString.js';
import { pubClient } from '@app/redis/index.js';

interface ICall {
  //   senderId: string;
  receiverId: string;
  type: CALL_TYPE;
}
const createCall = async (
  io: Server,
  user: any,
  payload: ICall,
  callback: (arg: any) => void,
) => {
  try {
    if (user?.userId === payload.receiverId) {
      return callbackFn(callback, {
        success: false,
        message: 'You cannot call yourself',
      });
    }
    const receiver = await prisma.user.findFirst({
      where: { id: payload.receiverId, isDeleted: false, status: 'active' },
    });
    if (!receiver)
      return callbackFn(callback, {
        success: false,
        message: 'Receiver not found',
      });

    const busyCall = await prisma.callHistory.findFirst({
      where: {
        status: { in: ['ringing', 'accepted'] },
        OR: [
          { senderId: user.userId },
          { receiverId: user.userId },
          { senderId: payload.receiverId },
          { receiverId: payload.receiverId },
        ],
      },
    });

    if (busyCall)
      return callbackFn(callback, {
        success: false,
        message: 'User is busy with in another call',
      });

    const result = await prisma.callHistory.create({
      data: {
        senderId: user?.userId,
        receiverId: payload.receiverId,
        type: payload.type || 'audio_call',
        channelName: `call_${generateCryptoString(18, ' ')?.trim()}`,
      },
      include: {
        sender: { select: { id: true, name: true, profile: true } },
        receiver: { select: { id: true, name: true, profile: true } },
      },
    });

    if (!result) {
      return callbackFn(callback, {
        success: false,
        message: 'Failed to send call',
      });
    }
    const userSocketId = await pubClient.hGet(
      'userId_to_socketId',
      user?.userId,
    );
    const receiverSocketId = await pubClient.hGet(
      'userId_to_socketId',
      result?.receiverId,
    );
    // io.to(receiverSocketId).emit('call:incoming', result);
    // io.to(userSocketId).emit('call:incoming', result);

    return result;
  } catch (error: any) {
    return callbackFn(callback, { success: false, message: error?.message });
  }
};
