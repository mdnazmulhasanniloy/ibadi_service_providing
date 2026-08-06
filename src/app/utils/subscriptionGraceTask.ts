import prisma from '@app/shared/prisma.js';

export const expireEndedSubscriptionGracePeriods = async () => {
  const result = await prisma.subscription.updateMany({
    where: {
      isActive: true,
      graceEndsAt: { lte: new Date() },
    },
    data: {
      isActive: false,
      isExpired: true,
    },
  });

  if (result.count > 0) {
    console.log(`Expired ${result.count} subscription grace period(s)`);
  }
};
