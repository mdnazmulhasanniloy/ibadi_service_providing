import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import {
  BookingStatus,
  PAYMENT_STATUS,
  Role,
  type Prisma,
} from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import StripeService from '@app/class/string.class.js';
import moment from 'moment';
import _ from 'lodash';
import { resolveStripeCustomer } from '../bookings/bookings.utils.js';
import { toFixed2 } from '../bookings/bookings.constants.js';
import { months } from './payments.constants.js';
import type {
  RevenueCatEvent,
  RevenueCatWebhookPayload,
} from './payments.interface.js';
import generateCryptoString from '@app/utils/generateCryptoString.js';

interface MonthlyData {
  month: string;
  total: number;
}

const checkout = async (payload: any) => {
  const [user, contents, booking] = await Promise.all([
    prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        customerId: true,
      },
    }),

    prisma.contents.findFirst({
      where: { type: 'main' },
    }),

    prisma.bookings.findUnique({
      where: {
        id: payload.bookingId,
        userId: payload.userId,
      },
    }),
  ]);

  if (!booking) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Booking not found');
  }

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  // Check existing pending/paid payment
  const existingPayment = await prisma.payments.findFirst({
    where: {
      bookingId: payload.bookingId,
      userId: payload.userId,
      status: {
        in: [PAYMENT_STATUS.pending, PAYMENT_STATUS.paid],
      },
    },
    include: {
      user: {
        select: {
          customerId: true,
        },
      },
    },
  });

  let payment;
  let customerId;

  if (existingPayment) {
    payment = existingPayment;
    customerId = existingPayment.user?.customerId;
  } else {
    const adminAmount = toFixed2(
      ((contents?.adminCommotions ?? 5) * booking.price) / 100,
    );

    const providerAmount = toFixed2(booking.price - adminAmount);

    const [createdPayment, customer] = await Promise.all([
      prisma.payments.create({
        data: {
          userId: user.id,
          providerId: booking.providerId,
          bookingId: booking.id,
          amount: booking.price,
          transactionId: generateCryptoString(5, ' '),
          nextPaymentDate:
            booking.bookingType === 'weekly'
              ? moment(booking.startDate).add(1, 'week').toDate()
              : null,

          adminParentage: adminAmount,
          providerParentage: providerAmount,

          // Do NOT set transactionId here.
          // It will be set after Stripe PaymentIntent succeeds.
        },
      }),

      resolveStripeCustomer(user),
    ]);

    payment = createdPayment;
    customerId = customer;
  }

  if (!payment) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment creation failed');
  }

  if (!customerId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Stripe customer not found');
  }

  // Get Stripe customer
  const customer =
    await StripeService.getStripe().customers.retrieve(customerId);

  const defaultPaymentMethod = (customer as any)?.invoice_settings
    ?.default_payment_method;

  if (!defaultPaymentMethod) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No saved card found');
  }

  // Create and confirm PaymentIntent
  const paymentIntent = await StripeService.getStripe().paymentIntents.create({
    amount: Math.round(payment.amount * 100),
    currency: 'usd',
    customer: customerId,
    payment_method: defaultPaymentMethod as string,
    off_session: true,
    confirm: true,

    metadata: {
      paymentId: payment.id,
      bookingId: booking.id,
    },
  });

  if (paymentIntent.status !== 'succeeded') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment failed');
  }

  // Confirm payment in database
  const result = await confirmPayment({
    paymentId: payment.id,
    paymentIntentId: paymentIntent.id,
  });

  return result;
};

const confirmPayment = async (payload: {
  paymentId: string;
  paymentIntentId: string;
}) => {
  const { paymentId, paymentIntentId } = payload;

  const stripe = StripeService.getStripe();

  try {
    // Retrieve PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment not successful');
    }

    // Get payment from database
    const paymentRecord = await prisma.payments.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        booking: {
          include: {
            bookingDays: true,
          },
        },
      },
    });

    if (!paymentRecord) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment not found');
    }

    // Already processed
    if (paymentRecord.status !== PAYMENT_STATUS.pending) {
      return paymentRecord;
    }

    // Get latest charge
    if (!paymentIntent.latest_charge) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Stripe charge not found');
    }

    const charge = await stripe.charges.retrieve(
      paymentIntent.latest_charge as string,
    );

    if (charge.refunded) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment has been refunded');
    }

    const paymentDate = moment.unix(charge.created).toDate();

    /**
     * IMPORTANT:
     * Use Stripe PaymentIntent ID as transactionId.
     *
     * PaymentIntent ID is unique and is directly related
     * to this payment.
     */
    const transactionId = paymentIntent.id;

    const chargeDetails = {
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
      paymentMethod: charge.payment_method,
      paymentMethodDetails: charge.payment_method_details?.card,
      transactionId,
      cardLast4: charge.payment_method_details?.card?.last4,
      paymentDate,
      receipt_url: charge.receipt_url,
    };

    console.log('Charge Details:', chargeDetails);

    await prisma.$transaction(async tx => {
      // =========================
      // ONE TIME BOOKING
      // =========================

      if (paymentRecord.booking.bookingType === 'one_time') {
        await tx.payments.update({
          where: {
            id: paymentId,
          },

          data: {
            status: PAYMENT_STATUS.paid,

            transactionId: chargeDetails.transactionId,

            paymentMethod: chargeDetails.paymentMethod,

            paidAt: paymentDate,

            booking: {
              update: {
                status: BookingStatus.requested,
                isActive: false,
                isPaid: true,
              },
            },
          },
        });

        return;
      }

      // =========================
      // WEEKLY BOOKING
      // =========================

      await tx.payments.update({
        where: {
          id: paymentId,
        },

        data: {
          status: PAYMENT_STATUS.paid,

          transactionId: chargeDetails.transactionId,

          paymentMethod: chargeDetails.paymentMethod,

          paidAt: paymentDate,

          nextPaymentDate: moment(paymentRecord.booking.startDate)
            .add(1, 'week')
            .toDate(),

          booking: {
            update: {
              status: BookingStatus.requested,

              isActive: true,

              isPaid: true,

              endDate: moment(paymentRecord.booking.startDate)
                .add(1, 'week')
                .toDate(),
            },
          },
        },
      });

      // =========================
      // PREVENT DUPLICATE BOOKINGS
      // =========================

      if (paymentRecord.booking.nextBooking) {
        return;
      }

      let previousBookingId: string | null = null;

      const TOTAL_WEEKS = 4;

      for (let week = 1; week <= TOTAL_WEEKS; week++) {
        const baseDate = moment(paymentRecord.booking.startDate).add(
          week,
          'weeks',
        );

        const newBooking = await tx.bookings.create({
          data: {
            userId: paymentRecord.booking.userId,

            providerId: paymentRecord.booking.providerId,

            price: paymentRecord.booking.price,

            startDate: baseDate.toDate(),

            endDate: moment(baseDate).add(1, 'week').toDate(),

            totalHours: paymentRecord.booking.totalHours,

            bookingType: paymentRecord.booking.bookingType,

            nextBooking: null,

            bookingDays: {
              create: paymentRecord.booking.bookingDays.map((day: any) => {
                const targetDate = moment(baseDate).day(day.day);

                return {
                  day: day.day,

                  startTime: targetDate
                    .clone()
                    .set({
                      hour: moment(day.startTime).hour(),

                      minute: moment(day.startTime).minute(),
                    })
                    .toDate(),

                  endTime: targetDate
                    .clone()
                    .set({
                      hour: moment(day.endTime).hour(),

                      minute: moment(day.endTime).minute(),
                    })
                    .toDate(),

                  durationHours: day.durationHours,
                };
              }),
            },
          },

          include: {
            bookingDays: true,
          },
        });

        if (!newBooking) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            'Failed to create booking',
          );
        }

        // Link previous booking -> next booking
        if (previousBookingId) {
          await tx.bookings.update({
            where: {
              id: previousBookingId,
            },

            data: {
              nextBooking: newBooking.id,
            },
          });
        }

        previousBookingId = newBooking.id;
      }
    });

    return await prisma.payments.findUnique({
      where: {
        id: paymentId,
      },

      include: {
        booking: {
          include: {
            bookingDays: true,
          },
        },
      },
    });
  } catch (error: any) {
    /**
     * Refund only if Stripe payment succeeded
     * but database confirmation failed.
     */
    if (paymentIntentId) {
      try {
        const paymentIntent =
          await stripe.paymentIntents.retrieve(paymentIntentId);

        if (
          paymentIntent.status === 'succeeded' &&
          paymentIntent.latest_charge
        ) {
          const charge = await stripe.charges.retrieve(
            paymentIntent.latest_charge as string,
          );

          if (!charge.refunded) {
            await StripeService.refund(paymentIntentId);
          }
        }
      } catch (refundError: any) {
        console.error('Refund error:', refundError.message);
      }
    }

    throw new AppError(
      httpStatus.BAD_REQUEST,
      error.message || 'Server internal error',
    );
  }
};

// const checkout = async (payload: any) => {
//   const [user, contents, bookings] = await Promise.all([
//     prisma.user.findUnique({
//       where: { id: payload.userId },
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         customerId: true,
//       },
//     }),
//     prisma.contents.findFirst({ where: { type: 'main' } }),
//     prisma.bookings.findUnique({
//       where: { id: payload.bookingId, userId: payload.userId },
//     }),
//   ]);

//   if (!bookings)
//     throw new AppError(httpStatus.BAD_REQUEST, 'Booking not found');
//   if (!user) throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
//   // if (!contents) throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
//   const isPaymentExists = await prisma.payments.findFirst({
//     where: {
//       bookingId: payload.bookingId,
//       userId: payload.userId,
//       status: {
//         in: [PAYMENT_STATUS.pending, PAYMENT_STATUS.paid],
//       },
//     },
//     include: {
//       user: {
//         select: {
//           customerId: true,
//         },
//       },
//     },
//   });
//   let payment, customerId;

//   if (isPaymentExists) {
//     payment = isPaymentExists;
//     customerId = isPaymentExists?.user?.customerId;
//   } else {
//     const adminAmount = toFixed2(
//       ((contents?.adminCommotions ?? 5) * bookings.price) / 100,
//     );
//     const providerAmount = toFixed2(bookings.price - adminAmount);

//     // // 4. Create payment record + resolve Stripe customer (independent, run in parallel)
//     const [createdPayment, customer] = await Promise.all([
//       prisma.payments.create({
//         data: {
//           userId: user.id,
//           providerId: bookings.providerId,
//           bookingId: bookings.id,
//           amount: bookings.price,
//           nextPaymentDate: moment(bookings.startDate).add(1, 'weeks').toDate(),
//           adminParentage: adminAmount,
//           providerParentage: providerAmount,
//         },
//       }),
//       resolveStripeCustomer(user),
//     ]);

//     // console.log(createdPayment);
//     // return createdPayment;
//     payment = createdPayment;
//     customerId = customer;
//   }
//   // 3. Compute commission split
//   if (!payment) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'payment creation failed');
//   }
//   if (!customerId) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Stripe customer not found');
//   }

//   // Get default saved payment method
//   const customer =
//     await StripeService.getStripe().customers.retrieve(customerId);
//   const defaultPaymentMethod = (customer as any)?.invoice_settings
//     ?.default_payment_method;

//   if (!defaultPaymentMethod) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'No saved card found');
//   }

//   const paymentIntent = await StripeService.getStripe().paymentIntents.create({
//     amount: Math.round(payment.amount * 100),
//     currency: 'usd',
//     customer: customerId,
//     payment_method: defaultPaymentMethod as string,
//     off_session: true,
//     confirm: true,
//     metadata: {
//       paymentId: payment.id,
//       bookingId: bookings.id,
//     },
//   });

//   if (paymentIntent.status !== 'succeeded') {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Payment  Failed');
//   }
//   const result = await confirmPayment({
//     paymentId: payment.id,
//     paymentIntentId: paymentIntent.id,
//   });
//   return result;

//   // // 5. Create Stripe checkout session
//   // const baseUrl = `${config.server_url}/payments/confirm-payment`;
//   // const redirectUrl = `${baseUrl}?sessionId={CHECKOUT_SESSION_ID}&paymentId=${payment.id}`;

//   // const checkoutSession = await StripeService.getCheckoutSession(
//   //   { amount: payment.amount, name: 'Service Provider Booking', quantity: 1 },
//   //   redirectUrl, // success_url
//   //   redirectUrl, // cancel_url (same as original)
//   //   customerId as string,
//   // );

//   // if (!checkoutSession?.url)
//   //   throw new AppError(
//   //     httpStatus.BAD_REQUEST,
//   //     'Failed to create checkout session',
//   //   );

//   // return checkoutSession.url;
// };

// const confirmPayment = async (payload: {
//   paymentId: string;
//   paymentIntentId: string;
// }) => {
//   const { paymentId, paymentIntentId } = payload;

//   const stripe = StripeService.getStripe();

//   const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
//   if (paymentIntent.status !== 'succeeded') {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Payment not successful');
//   }

//   try {
//     const isPaymentHave = await prisma.payments.findUnique({
//       where: { id: paymentId },
//       include: {
//         booking: {
//           include: {
//             bookingDays: true,
//           },
//         },
//       },
//     });

//     if (!isPaymentHave) {
//       throw new AppError(httpStatus.BAD_REQUEST, 'Payment not found');
//     }

//     if (isPaymentHave.status !== PAYMENT_STATUS.pending) {
//       throw new AppError(httpStatus.BAD_REQUEST, 'Payment already processed');
//     }

//     const charge = await StripeService.getStripe().charges.retrieve(
//       paymentIntent.latest_charge as string,
//     );

//     if (charge?.refunded) {
//       throw new AppError(httpStatus.BAD_REQUEST, 'Payment has been refunded');
//     }

//     const paymentDate = moment.unix(charge.created).toDate();

//     const chargeDetails = {
//       amount: charge?.amount,
//       currency: charge?.currency,
//       status: charge?.status,
//       paymentMethod: charge?.payment_method,
//       paymentMethodDetails: charge?.payment_method_details?.card,
//       transactionId: charge?.balance_transaction ?? paymentIntent?.id,
//       cardLast4: charge?.payment_method_details?.card?.last4,
//       paymentDate: paymentDate,
//       receipt_url: charge?.receipt_url,
//     };
//     console.log(chargeDetails);
//     // ✅ Transaction start
//     await prisma.$transaction(async tx => {
//       // =========================
//       // ✅ ONE TIME BOOKING
//       // =========================
//       if (isPaymentHave.booking.bookingType === 'one_time') {
//         await tx.payments.update({
//           where: { id: paymentId },
//           data: {
//             status: PAYMENT_STATUS.paid,
//             transactionId: chargeDetails?.transactionId as string,
//             paymentMethod: chargeDetails.paymentMethod,
//             paidAt: paymentDate,
//             booking: {
//               update: {
//                 status: BookingStatus.requested,
//                 isActive: false,
//                 isPaid: true,
//               },
//             },
//           },
//         });

//         return;
//       }

//       // =========================
//       // ✅ WEEKLY BOOKING
//       // =========================

//       // 1️⃣ Payment update
//       await tx.payments.update({
//         where: { id: paymentId },
//         data: {
//           status: PAYMENT_STATUS.paid,
//           transactionId: chargeDetails?.transactionId as string,
//           paymentMethod: chargeDetails.paymentMethod,
//           paidAt: paymentDate,
//           nextPaymentDate: moment(isPaymentHave.booking.startDate)
//             .add(1, 'weeks')
//             .toDate(),
//           booking: {
//             update: {
//               status: BookingStatus.requested,
//               isActive: true,
//               isPaid: true,
//               endDate: moment(isPaymentHave?.booking?.startDate)
//                 .add(1, 'week')
//                 .toDate(),
//             },
//           },
//         },
//       });

//       // ❗ duplicate booking prevent
//       if (isPaymentHave.booking.nextBooking) return;

//       let prevBookingId: string | null = null;
//       const TOTAL_WEEKS = 4;

//       for (let week = 1; week <= TOTAL_WEEKS; week++) {
//         const baseDate = moment(isPaymentHave.booking.startDate).add(
//           week,
//           'weeks',
//         );

//         const newBooking = await tx.bookings.create({
//           data: {
//             userId: isPaymentHave.booking.userId,
//             providerId: isPaymentHave.booking.providerId,
//             price: isPaymentHave.booking.price,
//             startDate: baseDate.toDate(),
//             endDate: moment(baseDate).add(1, 'week').toDate(),
//             totalHours: isPaymentHave.booking.totalHours,
//             bookingType: isPaymentHave.booking.bookingType,
//             nextBooking: null,

//             bookingDays: {
//               create: isPaymentHave.booking.bookingDays.map((day: any) => {
//                 const targetDate = moment(baseDate).day(day.day);

//                 return {
//                   day: day.day, // ✅ enum (Mon, Tue)
//                   startTime: targetDate
//                     .set({
//                       hour: moment(day.startTime).hour(),
//                       minute: moment(day.startTime).minute(),
//                     })
//                     .toDate(),
//                   endTime: targetDate
//                     .set({
//                       hour: moment(day.endTime).hour(),
//                       minute: moment(day.endTime).minute(),
//                     })
//                     .toDate(),
//                   durationHours: day.durationHours,
//                 };
//               }),
//             },
//           },
//           include: {
//             bookingDays: true,
//           },
//         });

//         if (!newBooking) {
//           throw new AppError(
//             httpStatus.BAD_REQUEST,
//             'Failed to create booking',
//           );
//         }

//         // 🔗 previous booking → next booking link
//         if (prevBookingId) {
//           await tx.bookings.update({
//             where: { id: prevBookingId },
//             data: {
//               nextBooking: newBooking.id,
//             },
//           });
//         }

//         prevBookingId = newBooking.id;
//       }
//     });

//     return isPaymentHave;
//   } catch (error: any) {
//     if (paymentIntentId) {
//       try {
//         const stripe = StripeService.getStripe();

//         const paymentIntent =
//           await stripe.paymentIntents.retrieve(paymentIntentId);

//         const chargeId = paymentIntent.latest_charge as string;

//         if (chargeId) {
//           const charge = await stripe.charges.retrieve(chargeId);

//           if (!charge.refunded) {
//             await StripeService.refund(paymentIntentId);
//           }
//         }
//       } catch (refundError: any) {
//         console.error('Refund error:', refundError.message);
//       }
//     }
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       error.message || 'Server internal error',
//     );
//   }
// };

const mongoIdPattern = /^[0-9a-fA-F]{24}$/;

const resolveRevenueCatUser = async (event: RevenueCatEvent) => {
  const candidates = [
    event.original_app_user_id,
    event.app_user_id,
    ...(event.aliases || []),
  ].filter((id): id is string => Boolean(id && mongoIdPattern.test(id)));
  if (!candidates.length) return null;
  return prisma.user.findFirst({ where: { id: { in: candidates } } });
};

const eventSubscriptionWhere = (event: RevenueCatEvent, userId: string) => {
  if (event.transaction_id) return { userId, trnId: event.transaction_id };
  if (event.original_transaction_id) {
    return {
      userId,
      originalTrnId: event.original_transaction_id,
      ...(event.product_id ? { productId: event.product_id } : {}),
    };
  }
  return {
    userId,
    ...(event.product_id ? { productId: event.product_id } : {}),
  };
};

// const revenueCatWebHook = async (payload: RevenueCatWebhookPayload) => {
//   console.log('🚀 ~ revenueCatWebHook ~ payload:', payload);
//   if (!payload?.event?.id || !payload.event.type) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Invalid RevenueCat payload');
//   }
//   const event = payload.event;

//   let webhookRecord = await prisma.revenueCatWebhookEvent.findUnique({
//     where: { eventId: event.id },
//   });
//   if (webhookRecord?.processed) {
//     const productChangeAlreadyApplied =
//       event.type === 'PRODUCT_CHANGE'
//         ? await prisma.subscription.findFirst({
//             where: { trnId: event.id },
//             select: { id: true },
//           })
//         : null;
//     if (event.type !== 'PRODUCT_CHANGE' || productChangeAlreadyApplied) {
//       return { processed: true, duplicate: true, eventId: event.id };
//     }
//     webhookRecord = await prisma.revenueCatWebhookEvent.update({
//       where: { eventId: event.id },
//       data: { processed: false, processedAt: null },
//     });
//   }
//   if (!webhookRecord) {
//     try {
//       webhookRecord = await prisma.revenueCatWebhookEvent.create({
//         data: {
//           eventId: event.id,
//           type: event.type,
//           appUserId: event.app_user_id || event.original_app_user_id || null,
//           payload: payload as unknown as Prisma.InputJsonValue,
//         },
//       });
//     } catch (error: unknown) {
//       webhookRecord = await prisma.revenueCatWebhookEvent.findUnique({
//         where: { eventId: event.id },
//       });
//       if (!webhookRecord) throw error;
//       if (webhookRecord.processed) {
//         return { processed: true, duplicate: true, eventId: event.id };
//       }
//     }
//   }

//   if (event.type === 'TEST') {
//     await prisma.revenueCatWebhookEvent.update({
//       where: { eventId: event.id },
//       data: { processed: true, processedAt: new Date() },
//     });
//     return { processed: true, test: true, eventId: event.id };
//   }

//   if (event.type === 'TRANSFER') {
//     const sourceIds = (event.transferred_from || []).filter(id =>
//       mongoIdPattern.test(id),
//     );
//     if (sourceIds.length) {
//       await prisma.subscription.updateMany({
//         where: { userId: { in: sourceIds }, isActive: true },
//         data: { isActive: false },
//       });
//     }
//     await prisma.revenueCatWebhookEvent.update({
//       where: { eventId: event.id },
//       data: { processed: true, processedAt: new Date() },
//     });
//     return { processed: true, eventId: event.id, type: event.type };
//   }

//   const user = await resolveRevenueCatUser(event);
//   if (!user) {
//     throw new AppError(
//       httpStatus.NOT_FOUND,
//       'RevenueCat App User ID does not match a user',
//     );
//   }

//   const activateTypes = new Set([
//     'INITIAL_PURCHASE',
//     'RENEWAL',
//     'PRODUCT_CHANGE',
//     'NON_RENEWING_PURCHASE',
//     'REFUND_REVERSED',
//   ]);

//   if (activateTypes.has(event.type)) {
//     const activeProductId =
//       event.type === 'PRODUCT_CHANGE'
//         ? event.new_product_id || event.product_id
//         : event.product_id;
//     const transactionId =
//       event.type === 'PRODUCT_CHANGE' ? event.id : event.transaction_id;

//     if (!activeProductId || !transactionId || !event.purchased_at_ms) {
//       throw new AppError(
//         httpStatus.BAD_REQUEST,
//         `Missing purchase fields for ${event.type}`,
//       );
//     }
//     const pkg = await prisma.packages.findFirst({
//       where: { productId: activeProductId },
//     });
//     if (!pkg) {
//       throw new AppError(
//         httpStatus.NOT_FOUND,
//         `Package not found for RevenueCat product ${activeProductId}`,
//       );
//     }

//     const existing = await prisma.subscription.findFirst({
//       where: { userId: user.id, trnId: transactionId },
//     });
//     await prisma.$transaction(async tx => {
//       await tx.subscription.updateMany({
//         where: {
//           userId: user.id,
//           isActive: true,
//           ...(existing ? { id: { not: existing.id } } : {}),
//         },
//         data: { isActive: false, pendingProductId: null },
//       });

//       const subscriptionData = {
//         packageId: pkg.id,
//         trnId: transactionId,
//         originalTrnId: event.original_transaction_id || null,
//         productId: activeProductId,
//         entitlementId: event.entitlement_ids?.[0] || null,
//         purchasedAt: new Date(event.purchased_at_ms as number),
//         expiresAt: event.expiration_at_ms
//           ? new Date(event.expiration_at_ms)
//           : null,
//         graceEndsAt: null,
//         store: event.store || null,
//         environment: event.environment || null,
//         isPaid: true,
//         isActive: true,
//         isExpired: false,
//         willRenew: event.type !== 'NON_RENEWING_PURCHASE',
//         cancelReason: null,
//         pendingProductId: null,
//         lastEventId: event.id,
//       };

//       if (existing) {
//         await tx.subscription.update({
//           where: { id: existing.id },
//           data: subscriptionData,
//         });
//       } else {
//         await tx.subscription.create({
//           data: { userId: user.id, ...subscriptionData },
//         });
//       }
//       await tx.revenueCatWebhookEvent.update({
//         where: { eventId: event.id },
//         data: { processed: true, processedAt: new Date() },
//       });
//     });
//   } else {
//     switch (event.type) {
//       case 'CANCELLATION':
//         await prisma.subscription.updateMany({
//           where: {
//             ...eventSubscriptionWhere(event, user.id),
//             isActive: true,
//           },
//           data: {
//             isActive: false,
//             willRenew: false,
//             cancelReason: event.cancel_reason || 'CANCELLATION',
//             lastEventId: event.id,
//           },
//         });
//         break;
//       case 'SUBSCRIPTION_PAUSED':
//         await prisma.subscription.updateMany({
//           where: {
//             ...eventSubscriptionWhere(event, user.id),
//             isActive: true,
//           },
//           data: {
//             willRenew: false,
//             cancelReason: 'SUBSCRIPTION_PAUSED',
//             lastEventId: event.id,
//           },
//         });
//         break;
//       case 'UNCANCELLATION':
//         await prisma.subscription.updateMany({
//           where: {
//             ...eventSubscriptionWhere(event, user.id),
//             isActive: true,
//           },
//           data: { willRenew: true, cancelReason: null, lastEventId: event.id },
//         });
//         break;
//       case 'SUBSCRIPTION_EXTENDED':
//         await prisma.subscription.updateMany({
//           where: {
//             ...eventSubscriptionWhere(event, user.id),
//             isActive: true,
//           },
//           data: {
//             ...(event.expiration_at_ms
//               ? { expiresAt: new Date(event.expiration_at_ms) }
//               : {}),
//             lastEventId: event.id,
//           },
//         });
//         break;
//       case 'EXPIRATION':
//         const expirationTime = event.expiration_at_ms
//           ? new Date(event.expiration_at_ms)
//           : new Date();
//         const graceEndsAt = new Date(
//           expirationTime.getTime() + 3 * 24 * 60 * 60 * 1000,
//         );
//         await prisma.subscription.updateMany({
//           where: {
//             ...eventSubscriptionWhere(event, user.id),
//             isActive: true,
//           },
//           data: {
//             isActive: graceEndsAt > new Date(),
//             isExpired: graceEndsAt <= new Date(),
//             willRenew: false,
//             expiresAt: expirationTime,
//             graceEndsAt,
//             cancelReason: event.expiration_reason || null,
//             lastEventId: event.id,
//           },
//         });
//         break;
//       case 'BILLING_ISSUE':
//       case 'INVOICE_ISSUANCE':
//       case 'TEMPORARY_ENTITLEMENT_GRANT':
//         break;
//       default:
//         console.warn(`Unhandled RevenueCat event: ${event.type}`);
//     }
//     await prisma.revenueCatWebhookEvent.update({
//       where: { eventId: event.id },
//       data: { processed: true, processedAt: new Date() },
//     });
//   }

//   return {
//     processed: true,
//     duplicate: false,
//     eventId: event.id,
//     type: event.type,
//   };
// };

const getAllPayments = async (query: Record<string, any>) => {
  const options = paginationHelper.calculatePagination(query);
  const { page, limit, skip } = options;

  const payments = await prisma.payments.findMany({
    skip,
    take: limit,
    include: {
      booking: true,
    },
  });

  const total = await prisma.payments.count();

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: payments,
  };
};

// const addPaymentMethod = async (userId: string, res: Response) => {
//   const user = await prisma.user.findUnique({
//     where: {
//       id: userId,
//     },
//     select: {
//       id: true,
//       name: true,
//       email: true,
//       customerId: true,
//     },
//   });
//   if (!user) throw new AppError(httpStatus.BAD_REQUEST, 'User not found');

//   const customerId = await resolveStripeCustomer(user);

//   const setupIntent = await StripeService.getStripe().setupIntents.create({
//     customer: customerId as string,
//   });

//   return {
//     url: `${config.server_url}/payments/form?clientSecret=${setupIntent.client_secret}&customerId=${customerId}`,
//   };
// };
// const savePaymentMethod = async (payload: any) => {
//   const { paymentMethodId, customerId } = payload;
//   console.log(payload);

//   await StripeService.getStripe().paymentMethods.attach(paymentMethodId, {
//     customer: payload.customerId,
//   });

//   const paymentMethods = await StripeService.getStripe().paymentMethods.list({
//     customer: customerId,
//     type: 'card',
//   });

//   // console.log(paymentMethods.data);
//   const url = `${config.server_url}/payments/payment-method/list/${customerId}`;
//   console.log('🚀 ~ savePaymentMethod ~ url:', url);

//   return { url };
// };

// const getCardList = async (customerId: string, res: Response) => {
//   console.log(customerId);
//   const paymentMethods = await StripeService.getStripe().paymentMethods.list({
//     customer: customerId,
//     type: 'card',
//   });
//   res.render('cards', {
//     cards: paymentMethods.data,
//   });
// };

const getDashboardCards = async () => {
  // Total users
  const totalUsers = await prisma.user.count({
    where: {
      role: Role.user,
      isDeleted: false,
      verification: {
        status: true,
      },
    },
  });

  // Total service providers
  const totalServiceProvider = await prisma.user.count({
    where: {
      role: Role.service_provider,
      isDeleted: false,
      verification: {
        status: true,
      },
    },
  });

  // Total earnings
  const totalEarnings = await prisma.payments.aggregate({
    where: {
      status: PAYMENT_STATUS.paid,
    },
    _sum: {
      amount: true,
    },
  });

  return {
    totalUsers,
    totalServiceProvider,
    totalEarnings: totalEarnings._sum.amount || 0,
  };
};

const adminDashboardChart = async (query: Record<string, any>) => {
  const incomeYear = Number(query.incomeYear) || moment().year();
  const incomeStartDate = moment().year(incomeYear).startOf('year').toDate();

  const incomeEndDate = moment().year(incomeYear).endOf('year').toDate();

  const year = Number(query.year) || moment().year();

  const startDate = moment().year(year).startOf('year').toDate();

  const endDate = moment().year(year).endOf('year').toDate();

  const orders = await prisma.payments.findMany({
    where: {
      status: PAYMENT_STATUS.paid,
      createdAt: {
        gte: incomeStartDate,
        lte: incomeEndDate,
      },
    },
  });

  const userData = await prisma.user.findMany({
    where: {
      OR: [{ role: Role.service_provider }, { role: Role.user }],
      verification: {
        is: {
          status: true,
        },
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      verification: true,
    },
  });

  const monthlyPayment: MonthlyData[] = Array.from(
    { length: months.length },
    (_, i) => {
      const month = i;

      const total = orders.filter(
        order => moment(order.createdAt).month() === month,
      ).length;

      return {
        month: months[i] as string,
        total,
      };
    },
  );

  const monthlyUser: MonthlyData[] = Array.from(
    { length: months.length },
    (_, i) => {
      const month = i;

      const total = userData.filter(
        user => moment(user.createdAt).month() === month,
      ).length;

      return {
        month: months[i] as string,
        total,
      };
    },
  );

  return {
    paymentData: monthlyPayment,
    userData: monthlyUser,
  };
};

//@te-ignore
export const paymentsService = {
  checkout,
  confirmPayment,
  getAllPayments,
  getDashboardCards,
  adminDashboardChart,
  // revenueCatWebHook,
};
