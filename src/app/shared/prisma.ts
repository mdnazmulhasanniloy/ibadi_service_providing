import { Prisma, PrismaClient } from '../../../generated/prisma/index.js';

const loggingExtension = Prisma.defineExtension({
  name: 'logging',
  query: {
    $allOperations: async ({ model, operation, args, query }: any) => {
      console.log(`[Prisma] Model: ${model}, Action: ${operation}`);
      try {
        const result = await query(args);
        return result;
      } catch (error) {
        console.error(`[Prisma] Error in ${model}.${operation}:`, error);
        throw error;
      }
    },
  },
});

const prisma = new PrismaClient({
  //  accelerateUrl: process.env.PRISMA_ACCELERATE_URL as string,
  transactionOptions: { maxWait: 10000, timeout: 10000 },
}).$extends(loggingExtension);

export default prisma;
