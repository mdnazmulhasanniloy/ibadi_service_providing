import AppError from '@app/error/AppError.js';
import prisma from '@app/shared/prisma.js';
import httpStatus from 'http-status';

export const getMyChatList = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  const [chats, totalCount] = await Promise.all([
    prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          where: {
            userId: { not: userId },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profile: true,
                role: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),

    prisma.chat.count({
      where: {
        participants: {
          some: { userId },
        },
      },
    }),
  ]);

  if (chats.length) {
    const chatIds = chats.map(chat => chat.id);

    const [messages, unreadCounts] = await Promise.all([
      // প্রতি chat-এর latest message
      prisma.messages.findMany({
        where: {
          chatId: { in: chatIds },
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['chatId'],
      }),

      // প্রতি chat-এর unread count
      prisma.messages.groupBy({
        by: ['chatId'],
        where: {
          chatId: { in: chatIds },
          senderId: { not: userId },
          seen: false,
        },
        _count: { id: true },
      }),
    ]);

    // Quick lookup map
    const messageMap = new Map(messages.map(m => [m.chatId, m]));
    const unreadMap = new Map(unreadCounts.map(u => [u.chatId, u._count.id]));

    const data = chats.map(chat => ({
      chat,
      message: messageMap.get(chat.id) ?? null,
      unreadMessageCount: unreadMap.get(chat.id) ?? 0,
    }));

    // Latest message time  sort
    data.sort((a, b) => {
      const dateA = a.message?.createdAt?.getTime() ?? 0;
      const dateB = b.message?.createdAt?.getTime() ?? 0;
      return dateB - dateA;
    });

    return {
      chats: data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPage: Math.ceil(totalCount / limit),
        hasMore: skip + data.length < totalCount,
      },
    };
  }

  return {
    chats: [],
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPage: Math.ceil(totalCount / limit),
      hasMore: skip + 0 < totalCount,
    },
  };
};
