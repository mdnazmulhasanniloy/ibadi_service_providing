import prisma from '@app/shared/prisma.js';

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

            // null user filter
            user: {
              isNot: null,
            },
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

      orderBy: {
        updatedAt: 'desc',
      },

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

  // empty array return
  if (!chats?.length) {
    return {
      chats: [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPage: Math.ceil(totalCount / limit),
        hasMore: false,
      },
    };
  }

  const chatIds = chats.map(chat => chat.id);

  const [messages, unreadCounts] = await Promise.all([
    prisma.messages.findMany({
      where: {
        chatId: {
          in: chatIds,
        },
      },

      orderBy: {
        createdAt: 'desc',
      },

      distinct: ['chatId'],
    }),

    prisma.messages.groupBy({
      by: ['chatId'],

      where: {
        chatId: {
          in: chatIds,
        },

        senderId: {
          not: userId,
        },

        seen: false,
      },

      _count: {
        id: true,
      },
    }),
  ]);

  const messageMap = new Map(messages.map(m => [m.chatId, m]));

  const unreadMap = new Map(unreadCounts.map(u => [u.chatId, u._count.id]));

  const data = chats.map(chat => ({
    chat,
    message: messageMap.get(chat.id) ?? null,
    unreadMessageCount: unreadMap.get(chat.id) ?? 0,
  }));

  // latest message sorting
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
};
