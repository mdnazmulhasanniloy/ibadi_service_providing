import prisma from '@app/shared/prisma.js';

const getReceiverId = async (chatId: string, currentUserId: string) => {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { participants: true },
  });

  if (!chat) return null;

  const receiver = chat.participants.find(p => p.userId !== currentUserId);
  return receiver?.userId ?? null;
};

export default getReceiverId;
