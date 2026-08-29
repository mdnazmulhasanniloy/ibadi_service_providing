import { Worker, type Job } from 'bullmq';
import {
  BookingStatus,
  PAYMENT_STATUS,
} from '../../../generated/prisma/index.js';
import StripeService from '@app/class/string.class.js';
import { toFixed2 } from '@app/module/bookings/bookings.constants.js';
import { connection, notificationQueue } from '@app/redis/index.js';
import prisma from '@app/shared/prisma.js';
import moment from 'moment';

type WeeklyRenewalJob = { bookingId: string };

const enqueueNotification = async (data: Record<string, string>) => {
  try {
    await notificationQueue.add('new_notification', { data });
  } catch (error) {
    console.error('[WeeklyRenewal] Failed to enqueue notification:', error);
  }
};

const activateNextBooking = (currentBookingId: string, nextBookingId: string) =>
  prisma.$transaction([
    prisma.bookings.update({
      where: { id: currentBookingId },
      data: { status: BookingStatus.expired, isActive: false },
    }),
    prisma.bookings.update({
      where: { id: nextBookingId },
      data: {
        status: BookingStatus.requested,
        isActive: true,
        isPaid: true,
      },
    }),
  ]);

const processWeeklyRenewal = async (job: Job<WeeklyRenewalJob>) => {
  const currentBooking = await prisma.bookings.findUnique({
    where: { id: job.data.bookingId },
    include: { user: { select: { customerId: true } } },
  });

  if (
    !currentBooking ||
    currentBooking.bookingType !== 'weekly' ||
    currentBooking.isDeleted ||
    currentBooking.status === BookingStatus.canceled ||
    currentBooking.status === BookingStatus.expired ||
    !currentBooking.isActive ||
    !currentBooking.nextBooking
  ) {
    return { skipped: true, reason: 'booking_not_renewable' };
  }

  if (!currentBooking.endDate || currentBooking.endDate > new Date()) {
    return { skipped: true, reason: 'booking_not_due' };
  }

  const nextBooking = await prisma.bookings.findUnique({
    where: { id: currentBooking.nextBooking },
    include: { bookingDays: true },
  });
  if (!nextBooking || nextBooking.isDeleted) {
    throw new Error('Next weekly booking not found');
  }

  // If Stripe succeeded before a process crash, never charge a second time.
  const paidPayment = await prisma.payments.findFirst({
    where: { bookingId: nextBooking.id, status: PAYMENT_STATUS.paid },
  });
  if (paidPayment || nextBooking.isPaid) {
    await activateNextBooking(currentBooking.id, nextBooking.id);
    return { success: true, alreadyPaid: true };
  }

  if (!currentBooking.user.customerId) {
    throw new Error('Stripe customer not found');
  }

  const stripe = StripeService.getStripe();
  const customer = await stripe.customers.retrieve(
    currentBooking.user.customerId,
  );
  if (customer.deleted) throw new Error('Stripe customer has been deleted');

  const paymentMethod = customer.invoice_settings.default_payment_method;
  if (!paymentMethod) throw new Error('No saved payment method found');
  const paymentMethodId =
    typeof paymentMethod === 'string' ? paymentMethod : paymentMethod.id;

  const contents = await prisma.contents.findFirst({ where: { type: 'main' } });
  const adminAmount = toFixed2(
    ((contents?.adminCommotions ?? 5) * nextBooking.price) / 100,
  );
  const providerAmount = toFixed2(nextBooking.price - adminAmount);

  let payment = await prisma.payments.findFirst({
    where: { bookingId: nextBooking.id, status: PAYMENT_STATUS.pending },
  });
  if (!payment) {
    payment = await prisma.payments.create({
      data: {
        userId: nextBooking.userId,
        providerId: nextBooking.providerId,
        bookingId: nextBooking.id,
        amount: nextBooking.price,
        adminParentage: adminAmount,
        providerParentage: providerAmount,
        nextPaymentDate: nextBooking.endDate,
      },
    });
  }

  const attempt = job.attemptsMade + 1;
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: Math.round(payment.amount * 100),
      currency: 'usd',
      customer: currentBooking.user.customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        paymentId: payment.id,
        bookingId: nextBooking.id,
        previousBookingId: currentBooking.id,
        renewalAttempt: String(attempt),
      },
    },
    {
      idempotencyKey: `weekly-renewal-${currentBooking.id}-${nextBooking.id}-${attempt}`,
    },
  );

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Stripe payment status: ${paymentIntent.status}`);
  }

  await prisma.$transaction(async tx => {
    await tx.payments.update({
      where: { id: payment.id },
      data: {
        status: PAYMENT_STATUS.paid,
        transactionId: paymentIntent.id,
        paymentMethod: paymentMethodId,
        paidAt: new Date(),
      },
    });
    await tx.bookings.update({
      where: { id: currentBooking.id },
      data: { status: BookingStatus.expired, isActive: false },
    });
    await tx.bookings.update({
      where: { id: nextBooking.id },
      data: {
        status: BookingStatus.requested,
        isActive: true,
        isPaid: true,
      },
    });

    // Keep an ongoing weekly subscription one week ahead. The initial checkout
    // creates a short chain; this extends it whenever its tail is reached.
    if (!nextBooking.nextBooking) {
      const followingStart =
        nextBooking.endDate ??
        moment(nextBooking.startDate).add(1, 'week').toDate();
      const followingBooking = await tx.bookings.create({
        data: {
          userId: nextBooking.userId,
          providerId: nextBooking.providerId,
          addressId: nextBooking.addressId,
          price: nextBooking.price,
          startDate: followingStart,
          endDate: moment(followingStart).add(1, 'week').toDate(),
          totalHours: nextBooking.totalHours,
          bookingType: 'weekly',
          isActive: false,
          bookingDays: {
            create: nextBooking.bookingDays.map(day => ({
              day: day.day,
              startTime: moment(day.startTime).add(1, 'week').toDate(),
              endTime: moment(day.endTime).add(1, 'week').toDate(),
              durationHours: day.durationHours,
            })),
          },
        },
      });
      await tx.bookings.update({
        where: { id: nextBooking.id },
        data: { nextBooking: followingBooking.id },
      });
    }
  });

  await Promise.all([
    enqueueNotification({
      receiverId: nextBooking.userId,
      bookingId: nextBooking.id,
      message: 'Weekly Payment Successful',
      description: `Your weekly payment of $${payment.amount.toFixed(2)} was successful.`,
    }),
    enqueueNotification({
      receiverId: nextBooking.providerId,
      bookingId: nextBooking.id,
      message: 'Weekly Booking Payment Received',
      description:
        'The customer has successfully paid for the next booking week.',
    }),
  ]);

  return { success: true, paymentIntentId: paymentIntent.id };
};

const bookingWorker = new Worker<WeeklyRenewalJob>(
  'booking_payments',
  processWeeklyRenewal,
  { connection },
);

bookingWorker.on('completed', (job, result) => {
  console.log(`[WeeklyRenewal] Job ${job.id} completed`, result);
});

bookingWorker.on('failed', async (job, error) => {
  console.error(`[WeeklyRenewal] Job ${job?.id} failed:`, error.message);
  if (!job || job.attemptsMade < (job.opts.attempts ?? 3)) return;

  const booking = await prisma.bookings.findUnique({
    where: { id: job.data.bookingId },
    select: { id: true, userId: true, nextBooking: true },
  });
  if (!booking) return;

  await enqueueNotification({
    receiverId: booking.userId,
    bookingId: booking.nextBooking ?? booking.id,
    message: 'Weekly Payment Failed',
    description:
      'We could not process your weekly payment after 3 attempts. Please update your payment method.',
  });
});

export default bookingWorker;
