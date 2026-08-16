import { Worker } from 'bullmq';
import { connection } from '@app/redis/index.js';
import prisma from '@app/shared/prisma.js';
import firebaseAdmin from '@app/utils/firebase.js';

const notificationWorker = new Worker(
  'general_notification',
  async job => {
    if (job.name === 'new_notification') {
      const payload = job.data;
      const save = await prisma.notification.create(payload);

      console.log('🔔 Sending notification...');
      console.log(payload);

      // 👉 to do:
      // - WebSocket emit
      // - Push notification (FCM)
      if (payload?.data?.receiverId) {
        const user = await prisma.user.findUnique({
          where: {
            id: payload?.data?.receiverId,
          },
          select: {
            fcmToken: true,
          },
        });
        console.log('🚀 ~ user:', user);
        if (user?.fcmToken) {
          await firebaseAdmin.messaging().send({
            token: user.fcmToken,
            notification: {
              title: payload?.data?.message,
              body: payload?.data.description,
            },
            data: {
              ...payload?.data,
            },
          });
        }
      }

      // - Email send
    }
  },
  { connection },
);

notificationWorker.on('completed', job => {
  console.log(`✅ Job completed: ${job.id}`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`❌ Job failed: ${job?.id}`, err);
});
