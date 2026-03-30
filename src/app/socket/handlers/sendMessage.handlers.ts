import { messageQueue, pubClient } from '@app/redis/index.js';
import prisma from '@app/shared/prisma.js';
import { Server, Socket } from 'socket.io';
import getChatList from './chatList.handlers.js';
import callbackFn from '@app/utils/callbackFn.js';
interface IPayload {
  images: string[];
  text: string;
  receiverId: string;
  chatId: string;
  senderId: string;
}
const sendMessage = async (
  io: Server,
  payload: IPayload,
  user: any,
  callback: (args: any) => void,
) => {
  try {
    if (!payload?.chatId) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          participants: {
            every: {
              userId: { in: [payload.receiverId, user.userId] },
            },
          },
        },
        include: {
          participants: true,
        },
      });

      if (existingChat) {
        payload.chatId = existingChat.id;
      } else {
        const chat = await prisma.chat.create({
          data: {
            status: 'accepted',
            participants: {
              create: [{ userId: user.userId }, { userId: payload.receiverId }],
            },
          },
        });
        payload.chatId = chat.id;
      }
    }

    const message = {
      chatId: payload?.chatId,
      receiverId: payload?.receiverId,
      senderId: user?.userId,
      text: payload?.text,
      ...(payload.images?.length > 0 && {
        images: {
          create: payload.images.map(url => ({ url })),
        },
      }),
      createdAt: new Date().toISOString(),
    };
    // ── BullMQ queue add (worker save in database) ─────
    await messageQueue.add('save', message);

    const redisKey = `chat:${payload.chatId}:messages`;
    await pubClient.rPush(redisKey, JSON.stringify(message));

    const [senderSocketId, receiverSocketId] = (await Promise.all([
      pubClient.hGet('userId_to_socketId', message.senderId),
      pubClient.hGet('userId_to_socketId', message.receiverId),
    ])) as string[];

    if (senderSocketId && receiverSocketId)
      (io.to(senderSocketId).emit('new_message', { message }),
        io.to(receiverSocketId).emit('new_message', { message }));
    getChatList(io, { userId: payload.senderId }, {}, callback);
    getChatList(io, { userId: payload.receiverId }, {}, callback);

    callbackFn(callback, {
      success: true,
      message: 'message send successfully',
      data: message,
    });
  } catch (error: any) {
    console.log(error);
    callbackFn(callback, {
      success: false,
      message: error?.message,
    });
  }
};

export default sendMessage;
