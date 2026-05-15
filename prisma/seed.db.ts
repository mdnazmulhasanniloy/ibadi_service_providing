import { PrismaClient, Role, status } from '../generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const createMapIndex = async () => {
  console.log('📍 Creating Geo Indexes...');

  try {
    // 🔥 Create new sparse unique indexes
    await prisma.$runCommandRaw({
      createIndexes: 'Payments',
      indexes: [
        {
          key: { transactionId: 1 },
          name: 'payments_transactionId_key',
          unique: true,
          sparse: true,
        },
      ],
    });

    await prisma.$runCommandRaw({
      createIndexes: 'Schedule',
      indexes: [
        {
          key: { location: '2dsphere' },
          name: 'Schedule_location_2dsphere',
        },
      ],
    });

    console.log('✅ Geo indexes ensured');
  } catch (error: any) {
    console.log(
      '⚠️ Index warning (safe to ignore if already exists):',
      error?.message,
    );
  }
};

/**
 * 🚀 Main Seeder
 */
const main = async () => {
  try {
    console.log('🌱 Seeding started...');

    await createMapIndex();

    console.log('🚀 Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

main();
