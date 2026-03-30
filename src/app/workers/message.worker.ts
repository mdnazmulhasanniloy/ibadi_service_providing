// @app/workers/message.worker.ts

import { Worker, Job } from 'bullmq';
import { connection } from '@app/redis/index.js';
import prisma from '@app/shared/prisma.js';
import colors from 'colors';

interface IMessageJob {
  chatId: string;
  senderId: string;
  receiverId: string;
  text?: string;
  images?: any;
}

const messageWorker = new Worker(
  'save_messages', // must me match with message que
  async (job: Job<IMessageJob>) => {
    const { chatId, senderId, receiverId, text, images } = job.data;

    // ── DB তে save ─────────────────────────────────────────
    const saved = await prisma.messages.create({
      data: {
        chatId,
        senderId,
        receiverId,
        text: text ?? null,
        images,
      },

      include: {
        images: true,
      },
    });

    // ── Chat updatedAt refresh ──────────────────────────────
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    console.log(colors.green(`✅ Message saved: ${saved.id}`));
    return saved;
  },
  { connection },
);

// ── Worker Events ─────────────────────────────────────────
messageWorker.on('completed', job => {
  console.log(colors.green.bold(`📨 Job ${job.id} completed`));
});

messageWorker.on('failed', (job, err) => {
  console.error(colors.red.bold(`❌ Job ${job?.id} failed:`), err.message);
});

export default messageWorker;
