// /**
//  * queues/booking.queue.ts
//  * BullMQ queue + worker for weekly Stripe recurring payments.
//  * Uses the same `connection` object from your redis/index.ts
//  */

// import { Queue, Worker, type Job } from 'bullmq';
// import prisma from '@app/shared/prisma.js';
// import { connection, pubClient } from '@app/redis/index.js';
// import colors from 'colors';
// import StripeService from '@app/class/string.class.js';

// const stripe = StripeService.getStripe();

// export const bookingQueue = new Queue('booking_payments', {
//   connection,
//   defaultJobOptions: {
//     attempts: 3,
//     backoff: {
//       type: 'exponential',
//       delay: 1000 * 60 * 5, // 5min → 10min → 20min
//     },
//     removeOnComplete: true,
//     removeOnFail: false,
//   },
// });

// // ─── Worker ───────────────────────────────────────────────────────────────────
// export const bookingWorker = new Worker(
//   'booking_payments',
//   async (job: Job) => {
//     const { bookingId, stripeCustomerId, paymentMethodId } = job.data;

//     // ── 1. Load booking with next pending schedule ──────────────────────────
//     const booking = await prisma.bookings.findUnique({
//       where: { id: bookingId },
//       include: {
//         recurringSchedule: {
//           where: { status: 'pending' },
//           orderBy: { weekNumber: 'asc' },
//           take: 1,
//         },
//       },
//     });

//     // Booking inactive হলে job remove করো
//     if (!booking || booking.status === 'canceled' || booking.isDeleted) {
//       await bookingQueue.remove(`weekly-${bookingId}`);
//       return { skipped: true, reason: 'booking_inactive' };
//     }

//     const nextSchedule = booking.recurringSchedule[0];

//     // সব schedule শেষ → booking complete
//     if (!nextSchedule) {
//       await prisma.bookings.update({
//         where: { id: bookingId },
//         data: { status: 'complete' },
//       });
//       await bookingQueue.remove(`weekly-${bookingId}`);
//       return { done: true };
//     }

//     // ── 2. Idempotency guard — processing এ mark করো ───────────────────────
//     await prisma.recurringSchedule.update({
//       where: { id: nextSchedule.id },
//       data: { status: 'processing' },
//     });

//     // ── 3. Payment record create ────────────────────────────────────────────
//     const payment = await prisma.payments.create({
//       data: {
//         userId: booking.userId,
//         bookingId,
//         amount: nextSchedule.amount,
//         status: 'pending',
//         paymentMethod: 'stripe',
//         isRecurring: true,
//       },
//     });

//     // ── 4. Stripe charge ────────────────────────────────────────────────────
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(nextSchedule.amount * 100),
//       currency: 'usd',
//       customer: stripeCustomerId,
//       payment_method: paymentMethodId,
//       confirm: true,
//       automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
//       metadata: {
//         bookingId,
//         paymentId: payment.id,
//         weekNumber: String(nextSchedule.weekNumber),
//       },
//     });

//     // ── 5. Update records ───────────────────────────────────────────────────
//     if (paymentIntent.status === 'succeeded') {
//       await prisma.$transaction([
//         prisma.payments.update({
//           where: { id: payment.id },
//           data: {
//             status: 'paid',
//             transactionId: paymentIntent.id,
//             paidAt: new Date(),
//           },
//         }),
//         prisma.recurringSchedule.update({
//           where: { id: nextSchedule.id },
//           data: {
//             status: 'paid',
//             paymentId: payment.id,
//             processedAt: new Date(),
//           },
//         }),
//       ]);
//     } else {
//       // Webhook final status handle করবে
//       await prisma.payments.update({
//         where: { id: payment.id },
//         data: { transactionId: paymentIntent.id },
//       });
//     }

//     // ── 6. Invalidate booking cache ─────────────────────────────────────────
//     await pubClient.del(`booking:${bookingId}`);

//     return {
//       success: paymentIntent.status === 'succeeded',
//       weekNumber: nextSchedule.weekNumber,
//       paymentIntentId: paymentIntent.id,
//     };
//   },
//   { connection },
// );

// // ─── Worker Events ────────────────────────────────────────────────────────────
// bookingWorker.on('completed', (job, result) => {
//   console.log(colors.green(`[BookingQueue] ✅ Job ${job.id} done`), result);
// });

// bookingWorker.on('failed', async (job, err) => {
//   console.error(
//     colors.red(`[BookingQueue] ❌ Job ${job?.id} failed:`),
//     err.message,
//   );

//   if (!job) return;
//   const { bookingId } = job.data;
//   const maxAttempts = job.opts.attempts ?? 3;

//   // সব retry শেষ হলে — fail mark + user notify
//   if (job.attemptsMade >= maxAttempts) {
//     const schedule = await prisma.recurringSchedule.findFirst({
//       where: { bookingId, status: 'processing' },
//     });
//     if (schedule) {
//       await prisma.recurringSchedule.update({
//         where: { id: schedule.id },
//         data: { status: 'failed' },
//       });
//     }

//     const booking = await prisma.bookings.findUnique({
//       where: { id: bookingId },
//       select: { userId: true },
//     });
//     if (booking) {
//       await prisma.notification.create({
//         data: {
//           receiverId: booking.userId,
//           bookingId,
//           message: 'Weekly payment failed',
//           description:
//             'We could not process your weekly payment after multiple attempts. Please update your payment method.',
//         },
//       });
//     }
//   }
// });
