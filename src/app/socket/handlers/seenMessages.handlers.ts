import callbackFn from '@app/utils/callbackFn.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import prisma from '@app/shared/prisma.js';
import { invalidateUserCache } from './invalidCash.js';
import getChatList from './chatList.handlers.js';

const SeenMessageHandlers = async (
  io: any,
  chatId: string,
  user: any,
  callback: any,
) => {
  if (!chatId) {
    return callbackFn(callback, {
      success: false,
      message: 'chatId id is required',
    });
  }

  try {
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        participants: true,
      },
    });

    if (!chat) {
      return callbackFn(callback, {
        success: false,
        message: 'chat not found',
      });
    }

    await prisma.messages.updateMany({
      where: {
        chatId: chat?.id,
        receiverId: user?.userId,
        seen: false,
      },
      data: {
        seen: true,
      },
    });

    const user1 = chat?.participants[0]?.userId;
    const user2 = chat?.participants[1]?.userId;
    if (user1 && user2) {
      invalidateUserCache(user1);
      invalidateUserCache(user2);

      getChatList(io, { userId: user1 }, { page: 1, limit: 10 }, callback);
      getChatList(io, { userId: user2 }, { page: 1, limit: 10 }, callback);
    }
  } catch (error: any) {
    console.log(error);
    return callbackFn(callback, {
      success: false,
      message: error?.message || 'seen message failed',
    });
  }
};

export default SeenMessageHandlers;
