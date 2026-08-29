import { BookingStatus } from '../../../generated/prisma/index.js';
import { bookingQueue } from '@app/redis/index.js';
import prisma from '@app/shared/prisma.js';

const ONE_HOUR = 60 * 60 * 1000;

export const enqueueDueWeeklyRenewals = async () => {
  const dueBookings = await prisma.bookings.findMany({
    where: {
      bookingType: 'weekly',
      isActive: true,
      isDeleted: false,
      isPaid: true,
      nextBooking: { not: null },
      endDate: { lte: new Date() },
      status: { notIn: [BookingStatus.canceled, BookingStatus.expired] },
    },
    select: { id: true },
  });

  await Promise.all(
    dueBookings.map(booking =>
      bookingQueue.add(
        'weekly-renewal',
        { bookingId: booking.id },
        { jobId: `weekly-renewal-${booking.id}` },
      ),
    ),
  );
  return dueBookings.length;
};

export const startWeeklyBookingTask = () => {
  const run = () =>
    enqueueDueWeeklyRenewals().catch(error =>
      console.error('[WeeklyRenewal] Scheduler failed:', error),
    );

  void run();
  return setInterval(run, ONE_HOUR).unref();
};
