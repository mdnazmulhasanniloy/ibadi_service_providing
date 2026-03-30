import { pubClient } from '@app/redis/index.js';
import prisma from '@app/shared/prisma.js';
import callbackFn from '@app/utils/callbackFn.js';
import { Server } from 'socket.io';
import type { Role } from '../../../../generated/prisma/index.js';

const MessagePageHandlers = async (
  io: Server,
  payload: { userId: string; limit: number; page: number },
  currentUserId: string,
  callback: (data: any) => void,
) => {
  const { userId, page = 1, limit = 10 } = payload;
  if (!userId) {
    return callbackFn(callback, {
      success: false,
      message: 'userId is required',
    });
  }
  const skip = (page - 1) * limit;
  try {
    // 1️⃣ Check Redis cache for receiver details
    const receiverCacheKey = `user_details:${userId}`;
    let receiverDetails: {
      id: string;
      name: string | null;
      role: Role;
      email: string;
      profile: string | null;
    } | null;

    const cachedReceiver = await pubClient.get(receiverCacheKey);
    if (cachedReceiver) {
      receiverDetails = JSON.parse(cachedReceiver);
    } else {
      const receiverData = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          profile: true,
          role: true,
        },
      });
      receiverDetails = receiverData;

      if (!receiverDetails) {
        return callbackFn(callback, {
          success: false,
          message: 'User not found!',
        });
      }
      await pubClient.setEx(
        receiverCacheKey,
        60,
        JSON.stringify(receiverDetails),
      );
    }
    console.log(receiverDetails);
    if (!receiverDetails) {
      return;
    }

    const userDetails = {
      _id: receiverDetails.id,
      name: receiverDetails.name,
      email: receiverDetails.email,
      profile: receiverDetails.profile,
      role: receiverDetails.role,
    };

    // 2️⃣ Get sender’s socket ID from Redis
    const userSocket = await pubClient.hGet(
      'userId_to_socketId',
      currentUserId,
    );

    if (!userSocket) {
      return callbackFn(callback, {
        success: false,
        message: 'User socket ID not found',
      });
    }

    // 3️⃣ Emit receiver details to socket
    io.to(userSocket).emit('user_details', userDetails);

    // 4️⃣ Redis caching for messages
    const participants = [currentUserId, userId].sort().join(':');
    const messageCacheKey = `messages:${participants}:${page}:${limit}`;
    // const messageCacheKey = `messages:${currentUserId}:${userId}:${page}:${limit}`;
    let getPreMessage;

    const cachedMessages = false; // await pubClient.get(messageCacheKey);
    if (cachedMessages) {
      getPreMessage = JSON.parse(cachedMessages);
    } else {
      getPreMessage = await prisma.messages.findMany({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: userId },
            { senderId: userId, receiverId: currentUserId },
          ],
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          text: true,
          seen: true,
          createdAt: true,
          updatedAt: true,
          chatId: true,
          senderId: true,
          receiverId: true,
          images: true,
          // ── include এর বদলে select এর ভেতরেই ──
          chat: true,
          receiver: {
            select: {
              id: true,
              name: true,
              role: true,
              email: true,
              profile: true,
            },
          },
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
              email: true,
              profile: true,
            },
          },
        },
      });

      await pubClient.setEx(messageCacheKey, 30, JSON.stringify(getPreMessage));
    }

    const countCacheKey = `messages_count:${participants}`;

    let totalMessages;
    const cachedCount = await pubClient.get(countCacheKey);

    if (cachedCount) {
      totalMessages = Number(cachedCount);
    } else {
      totalMessages = await prisma.messages.count({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: userId },
            { senderId: userId, receiverId: currentUserId },
          ],
        },
      });

      await pubClient.setEx(countCacheKey, 30, totalMessages.toString());
    }

    // 4️⃣ Total Message Count
    // const totalMessages = await prisma.messages.count({
    //   where: {
    //     OR: [
    //       { senderId: currentUserId, receiverId: userId },
    //       { senderId: userId, receiverId: currentUserId },
    //     ],
    //   },
    // });

    const messages = getPreMessage?.reverse() || [];

    const response = {
      data: messages,
      meta: {
        page,
        limit,
        total: totalMessages,
        totalPage: Math.ceil(totalMessages / limit),
        hasMore: skip + (getPreMessage?.length || 0) < totalMessages,
      },
    };

    // 5️⃣ Emit previous messages
    io.to(userSocket).emit('message', response || []);

    // 6️⃣ Final callback
    // callbackFn(callback, {
    //   success: true,
    //   message: 'Message page data retrieved successfully',
    //   data: {
    //     ...response,
    //     userDetails,
    //   },
    // });
  } catch (error: any) {
    console.error('Error in message-page event:', error);
    callbackFn(callback, {
      success: false,
      message: error.message,
    });
  }
};

export default MessagePageHandlers;
