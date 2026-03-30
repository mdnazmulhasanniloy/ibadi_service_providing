import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, Socket } from 'socket.io';
import { pubClient, subClient } from '@app/redis/index.js';
import { socketAuthMiddleware } from './middleware/auth.socket.js';
import { getOnlineUserIds } from './handlers/onlineUser.handlers.js';
import MessagePageHandlers from './handlers/massagePage.handlers.js';
import getChatList from './handlers/chatList.handlers.js';
import SeenMessageHandlers from './handlers/seenMessages.handlers.js';
import sendMessage from './handlers/sendMessage.handlers.js';
import getReceiverId from './services/getReciverId.js';

// ── Types ─────────────────────────────────────────────────
interface IMessagePagePayload {
  userId: string;
  limit: number;
  page: number;
}

interface IChatListPayload {
  limit: number;
  page: number;
}

// ── Redis map helpers ─────────────────────────────────────
const setUserSocket = (userId: string, socketId: string) =>
  Promise.all([
    pubClient.hSet('userId_to_socketId', userId, socketId),
    pubClient.hSet('socketId_to_userId', socketId, userId),
  ]);

const removeUserSocket = (userId: string, socketId: string) =>
  Promise.all([
    pubClient.hDel('userId_to_socketId', userId),
    pubClient.hDel('socketId_to_userId', socketId),
  ]);

// ── Typing helper ─────────────────────────────────────────
const handleTypingEvent = async (
  io: Server,
  socket: Socket,
  chatId: string,
  event: 'typing' | 'stopTyping',
) => {
  const receiverId = await getReceiverId(chatId, socket.data.userId);
  if (!receiverId) return;

  const userSocketId = await pubClient.hGet('userId_to_socketId', receiverId);
  if (!userSocketId) return;

  const message =
    event === 'typing'
      ? `${socket.data.name} is typing...`
      : `${socket.data.name} stopped typing...`;

  io.to(userSocketId).emit(event, { message });
};

// ── Main ──────────────────────────────────────────────────
const initializeSocket = async (server: HttpServer) => {
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  io.adapter(createAdapter(pubClient, subClient));
  io.use(socketAuthMiddleware);
  global.socketio = io;

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data?.userId as string;

    if (!userId) {
      console.warn(
        `Socket ${socket.id} connected without userId — disconnecting`,
      );
      socket.disconnect();
      return;
    }

    console.log(`✅ Connected: userId=${userId} socketId=${socket.id}`);
    await setUserSocket(userId, socket.id);

    // ── Handlers ───────────────────────────────────────────
    socket.on('getOnlineUsers', () => getOnlineUserIds(io));

    socket.on('message_page', (payload: IMessagePagePayload, callback: any) =>
      MessagePageHandlers(io, payload, userId, callback),
    );

    socket.on('my_chat_list', (payload: IChatListPayload, callback: any) =>
      getChatList(io, socket.data, payload, callback),
    );

    socket.on('seen', ({ chatId }: { chatId: string }, callback: any) =>
      SeenMessageHandlers(io, chatId, socket.data, callback),
    );

    socket.on('send_message', (payload: any, callback: any) =>
      sendMessage(io, payload, socket.data, callback),
    );

    socket.on('typing', ({ chatId }: { chatId: string }) =>
      handleTypingEvent(io, socket, chatId, 'typing').catch(err =>
        console.error('typing error:', err),
      ),
    );

    socket.on('stopTyping', ({ chatId }: { chatId: string }) =>
      handleTypingEvent(io, socket, chatId, 'stopTyping').catch(err =>
        console.error('stopTyping error:', err),
      ),
    );

    // ── Disconnect ─────────────────────────────────────────
    socket.on('disconnect', async () => {
      const uid = await pubClient.hGet('socketId_to_userId', socket.id);
      if (uid) {
        await removeUserSocket(uid, socket.id);
        console.log(`❌ Disconnected: userId=${uid} socketId=${socket.id}`);
      }
    });
  });

  return io;
};

export default initializeSocket;
