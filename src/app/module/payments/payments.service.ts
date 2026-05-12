/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import {
  PAYMENT_STATUS,
  type Prisma,
} from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import StripeService from '@app/class/string.class.js';
import type { Response } from 'express';
import moment from 'moment';
import _ from 'lodash';
import { resolveStripeCustomer } from '../bookings/bookings.utils.js';
import config from '@app/config/index.js';

//Create Function
// const confirmPayment = async (query: Record<string, any>, res: Response) => {
//   const { sessionId, paymentId } = query;
//   const PaymentSession = await StripeService.getPaymentSession(sessionId);
//   const paymentIntentId = PaymentSession.payment_intent as string;
//   const paymentIntent =
//     await StripeService.getStripe().paymentIntents.retrieve(paymentIntentId);

//   if (!(await StripeService.isPaymentSuccess(sessionId))) {
//     await prisma.payments.update({
//       where: { id: paymentId },
//       data: { status: PAYMENT_STATUS.canceled },
//     });

//     throw res.render('paymentError', {
//       message: 'Payment session is not completed',
//       device: '',
//     });
//   }

//   try {
//     const isPaymentHave = await prisma.payments.findUnique({
//       where: { id: paymentId },
//       // select: {
//       //   status: true,
//       //   booking: {
//       //     select: {
//       //       startDate: true,
//       //       bookingType: true,
//       //     },
//       //   },
//       // },

//       include: {
//         booking: {
//           include: {
//             bookingDays: true,
//           },
//         },
//       },
//     });

//     if (!isPaymentHave) {
//       throw res.render('paymentError', {
//         message: 'Payment not found',
//         device: '',
//       });
//     }

//     if (isPaymentHave.status === PAYMENT_STATUS.paid) {
//       throw res.render('paymentError', {
//         message: 'Payment is already confirmed',
//         device: '',
//       });
//     }

//     const charge = await StripeService.getStripe().charges.retrieve(
//       paymentIntent.latest_charge as string,
//     );

//     if (charge?.refunded) {
//       throw res.render('paymentError', {
//         message: 'Payment has been refunded',
//         device: '',
//       });
//     }

//     const paymentDate = moment.unix(charge.created).format('YYYY-MM-DD HH:mm');
//     const chargeDetails = {
//       amount: charge?.amount,
//       currency: charge?.currency,
//       status: charge?.status,
//       paymentMethod: charge?.payment_method,
//       paymentMethodDetails: charge?.payment_method_details?.card,
//       transactionId: charge?.balance_transaction,
//       cardLast4: charge?.payment_method_details?.card?.last4,
//       paymentDate: paymentDate,
//       receipt_url: charge?.receipt_url,
//     };
//     let payment;
//     if (isPaymentHave.booking.bookingType === 'one_time') {
//       payment = await prisma.payments.update({
//         where: { id: paymentId },
//         data: {
//           status: PAYMENT_STATUS.paid,
//           // nextPaymentDate: moment(isPaymentHave.booking.startDate)
//           //   .add(1, 'weeks')
//           //   .toDate(),
//           transactionId: chargeDetails.transactionId as string,
//           paymentMethod: chargeDetails.paymentMethod,
//           booking: {
//             update: {
//               isActive: true,
//               isPaid: true,
//             },
//           },
//         },
//         include: {
//           booking: true,
//         },
//       });
//     } else {
//       payment = await prisma.payments.update({
//         where: { id: paymentId },
//         data: {
//           status: PAYMENT_STATUS.paid,
//           nextPaymentDate: moment(isPaymentHave.booking.startDate)
//             .add(1, 'weeks')
//             .toDate(),
//           transactionId: chargeDetails.transactionId as string,
//           paymentMethod: chargeDetails.paymentMethod,
//           booking: {
//             update: {
//               isActive: true,
//               isPaid: true,
//             },
//           },
//         },
//         include: {
//           booking: true,
//         },
//       });

//       let prevBookingId: string | null = null;

//       const bookings: any[] = [];
//       for (const week of _.range(3)) {
//         const baseDate = moment(isPaymentHave.booking.startDate).add(
//           week,
//           'weeks',
//         );

//         const booking = await prisma.bookings.create({
//           data: {
//             userId: isPaymentHave.booking.userId,
//             providerId: isPaymentHave.booking.providerId,
//             price: isPaymentHave.booking.price,
//             startDate: baseDate.toDate(),
//             totalHours: isPaymentHave.booking.totalHours,
//             bookingType: isPaymentHave.booking.bookingType,
//             nextBooking:,
//             bookingDays: {
//               create: [
//                 ...(isPaymentHave?.booking?.bookingDays?.map((day: any) => ({
//                   day: moment(baseDate).day(day.day).toDate(),
//                   startTime: day.startTime,
//                   endTime: day.endTime,
//                   durationHours: day.durationHours,
//                 })))
//               ],
//             },
//           },

//           include: {
//             bookingDays: true,
//           },
//         });

//         if (!booking)
//           throw new AppError(
//             httpStatus.BAD_REQUEST,
//             'Failed to create booking',
//           );

//         bookings.push(booking);

//         if (prevBookingId) {
//           await prisma.bookings.update({
//             where: { id: prevBookingId },

//             data: {
//               nextBooking: booking.id,
//             },
//           });
//         }

//         prevBookingId = booking.id;
//       }
//     }
//   } catch (error: any) {
//     if (paymentIntentId) {
//       try {
//         await StripeService.refund(paymentIntentId);
//       } catch (refundError: any) {
//         console.error('Error processing refund:', refundError.message);
//       }
//     }
//     throw res.render('paymentError', {
//       message: error.message || 'Server internal error',
//       device: '',
//     });
//   }
// };

const confirmPayment = async (query: Record<string, any>, res: Response) => {
  const { sessionId, paymentId } = query;

  const PaymentSession = await StripeService.getPaymentSession(sessionId);
  const paymentIntentId = PaymentSession.payment_intent as string;

  const paymentIntent =
    await StripeService.getStripe().paymentIntents.retrieve(paymentIntentId);

  if (!(await StripeService.isPaymentSuccess(sessionId))) {
    await prisma.payments.update({
      where: { id: paymentId },
      data: { status: PAYMENT_STATUS.canceled },
    });

    return res.render('paymentError', {
      message: 'Payment session is not completed',
      device: '',
    });
  }

  try {
    const isPaymentHave = await prisma.payments.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            bookingDays: true,
          },
        },
      },
    });

    if (!isPaymentHave) {
      return res.render('paymentError', {
        message: 'Payment not found',
        device: '',
      });
    }

    if (isPaymentHave.status !== PAYMENT_STATUS.pending) {
      return res.render('paymentError', {
        message: 'Payment already processed',
        device: '',
      });
    }

    const charge = await StripeService.getStripe().charges.retrieve(
      paymentIntent.latest_charge as string,
    );

    if (charge?.refunded) {
      return res.render('paymentError', {
        message: 'Payment has been refunded',
        device: '',
      });
    }

    const paymentDate = moment.unix(charge.created).toDate();

    const chargeDetails = {
      amount: charge?.amount,
      currency: charge?.currency,
      status: charge?.status,
      paymentMethod: charge?.payment_method,
      paymentMethodDetails: charge?.payment_method_details?.card,
      transactionId: charge?.balance_transaction,
      cardLast4: charge?.payment_method_details?.card?.last4,
      paymentDate: paymentDate,
      receipt_url: charge?.receipt_url,
    };

    // ✅ Transaction start
    await prisma.$transaction(async tx => {
      // =========================
      // ✅ ONE TIME BOOKING
      // =========================
      if (isPaymentHave.booking.bookingType === 'one_time') {
        await tx.payments.update({
          where: { id: paymentId },
          data: {
            status: PAYMENT_STATUS.paid,
            transactionId: chargeDetails.transactionId as string,
            paymentMethod: chargeDetails.paymentMethod,
            paidAt: paymentDate,
            booking: {
              update: {
                isActive: true,
                isPaid: true,
              },
            },
          },
        });

        return;
      }

      // =========================
      // ✅ WEEKLY BOOKING
      // =========================

      // 1️⃣ Payment update
      await tx.payments.update({
        where: { id: paymentId },
        data: {
          status: PAYMENT_STATUS.paid,
          transactionId: chargeDetails.transactionId as string,
          paymentMethod: chargeDetails.paymentMethod,
          paidAt: paymentDate,
          nextPaymentDate: moment(isPaymentHave.booking.startDate)
            .add(1, 'weeks')
            .toDate(),
          booking: {
            update: {
              isActive: true,
              isPaid: true,
              endDate: moment(isPaymentHave?.booking?.startDate)
                .add(1, 'week')
                .toDate(),
            },
          },
        },
      });

      // ❗ duplicate booking prevent
      if (isPaymentHave.booking.nextBooking) return;

      let prevBookingId: string | null = null;
      const TOTAL_WEEKS = 4;

      for (let week = 1; week <= TOTAL_WEEKS; week++) {
        const baseDate = moment(isPaymentHave.booking.startDate).add(
          week,
          'weeks',
        );

        const newBooking = await tx.bookings.create({
          data: {
            userId: isPaymentHave.booking.userId,
            providerId: isPaymentHave.booking.providerId,
            price: isPaymentHave.booking.price,
            startDate: baseDate.toDate(),
            endDate: moment(baseDate).add(1, 'week').toDate(),  
            totalHours: isPaymentHave.booking.totalHours,
            bookingType: isPaymentHave.booking.bookingType,
            nextBooking: null,

            bookingDays: {
              create: isPaymentHave.booking.bookingDays.map((day: any) => {
                const targetDate = moment(baseDate).day(day.day);

                return {
                  day: day.day, // ✅ enum (Mon, Tue)
                  startTime: targetDate
                    .set({
                      hour: moment(day.startTime).hour(),
                      minute: moment(day.startTime).minute(),
                    })
                    .toDate(),
                  endTime: targetDate
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

        // 🔗 previous booking → next booking link
        if (prevBookingId) {
          await tx.bookings.update({
            where: { id: prevBookingId },
            data: {
              nextBooking: newBooking.id,
            },
          });
        }

        prevBookingId = newBooking.id;
      }
    });

    // ✅ Success
    return res.render('paymentSuccess', {
      message: 'Payment confirmed successfully',
      device: '',
      paymentDetails: {
        ...chargeDetails,
        paymentDate: moment(paymentDate).format('lll'),
      },
      bookingId: paymentId,
    });
  } catch (error: any) {
    console.error(error);

    // ❗ error হলে refund try
    if (paymentIntentId) {
      try {
        await StripeService.refund(paymentIntentId);
      } catch (refundError: any) {
        console.error('Refund error:', refundError.message);
      }
    }

    return res.render('paymentError', {
      message: error.message || 'Server internal error',
      device: '',
    });
  }
};

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

const autoPayment = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  const paymentIntent = await StripeService.getStripe().paymentIntents.create({
    amount: 5000,
    currency: 'usd',
    customer: user?.customerId as string,
    // payment_method: 'pm_xxx', // optional if default set
    off_session: true,
    confirm: true,
  });

  console.log(paymentIntent);
};

const addPaymentMethod = async (userId: string, res: Response) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      customerId: true,
    },
  });
  if (!user) throw new AppError(httpStatus.BAD_REQUEST, 'User not found');

  const customerId = await resolveStripeCustomer(user);

  const setupIntent = await StripeService.getStripe().setupIntents.create({
    customer: customerId as string,
  });

  return {
    url: `${config.server_url}/payments/form?clientSecret=${setupIntent.client_secret}&customerId=${customerId}`,
  };
};
const savePaymentMethod = async (payload: any) => {
  const { paymentMethodId, customerId } = payload;
  console.log(payload);

  await StripeService.getStripe().paymentMethods.attach(paymentMethodId, {
    customer: payload.customerId,
  });

  const paymentMethods = await StripeService.getStripe().paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  // console.log(paymentMethods.data);
  const url = `${config.server_url}/payments/payment-method/list/${customerId}`;
  console.log('🚀 ~ savePaymentMethod ~ url:', url);

  return { url };
};

const getCardList = async (customerId: string, res: Response) => {
  console.log(customerId);
  const paymentMethods = await StripeService.getStripe().paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  res.render('cards', {
    cards: paymentMethods.data,
  });
};
export const paymentsService = {
  confirmPayment,
  autoPayment,
  addPaymentMethod,
  savePaymentMethod,
  getCardList,
};
