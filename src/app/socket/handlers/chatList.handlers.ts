import { pubClient } from '@app/redis/index.js';
import callbackFn from '@app/utils/callbackFn.js';
import { Server } from 'socket.io';
import { getMyChatList } from '../services/getChatList.js';

const getChatList = async (
  io: Server,
  user: any,
  payload: { limit?: number; page?: number } = { page: 1, limit: 10 },
  callback: (arg: any) => void,
) => {
  console.log(payload);
  const { page = 1, limit = 10 } = payload;
  const skip = (page - 1) * limit;
  try {
    const redisKey = `chat_list:${user.userId}:${page}:${limit}`;
    const cachedChatList = await pubClient.get(redisKey);

    let chatList;

    if (cachedChatList) {
      chatList = JSON.parse(cachedChatList);
    } else {
      chatList = await getMyChatList(user.userId, page, limit);
      await pubClient.set(redisKey, JSON.stringify(chatList), {
        EX: 30, // Cache 30s
      });
    }

    const userSocketId = (await pubClient.hGet(
      'userId_to_socketId',
      user?.userId?.toString(),
    )) as string;
    io.to(userSocketId).emit('chat_list', chatList);

    callbackFn(callback, {
      success: true,
      message: 'chat list get success',
      data: chatList,
    });
  } catch (error: any) {
    return callbackFn(callback, { success: false, message: error?.message });
  }
};

export default getChatList;
