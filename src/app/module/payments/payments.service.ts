import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import {
  BookingStatus,
  PAYMENT_STATUS,
  Role,
} from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import StripeService from '@app/class/string.class.js';
import moment from 'moment';
import _ from 'lodash';
import { resolveStripeCustomer } from '../bookings/bookings.utils.js';
import { toFixed2 } from '../bookings/bookings.constants.js';
import { months } from './payments.constants.js';

interface MonthlyData {
  month: string;
  total: number;
}

const checkout = async (payload: any) => {
  const [user, contents, bookings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        customerId: true,
      },
    }),
    prisma.contents.findFirst({ where: { type: 'main' } }),
    prisma.bookings.findUnique({
      where: { id: payload.bookingId, userId: payload.userId },
    }),
  ]);

  if (!bookings)
    throw new AppError(httpStatus.BAD_REQUEST, 'Booking not found');
  if (!user) throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  // if (!contents) throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  const isPaymentExists = await prisma.payments.findFirst({
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
  let payment, customerId;

  if (isPaymentExists) {
    payment = isPaymentExists;
    customerId = isPaymentExists?.user?.customerId;
  } else {
    const adminAmount = toFixed2(
      ((contents?.adminCommotions ?? 5) * bookings.price) / 100,
    );
    const providerAmount = toFixed2(bookings.price - adminAmount);

    // // 4. Create payment record + resolve Stripe customer (independent, run in parallel)
    const [createdPayment, customer] = await Promise.all([
      prisma.payments.create({
        data: {
          userId: user.id,
          providerId: bookings.providerId,
          bookingId: bookings.id,
          amount: bookings.price,
          nextPaymentDate: moment(bookings.startDate).add(1, 'weeks').toDate(),
          adminParentage: adminAmount,
          providerParentage: providerAmount,
        },
      }),
      resolveStripeCustomer(user),
    ]);

    // console.log(createdPayment);
    // return createdPayment;
    payment = createdPayment;
    customerId = customer;
  }
  // 3. Compute commission split
  if (!payment) {
    throw new AppError(httpStatus.BAD_REQUEST, 'payment creation failed');
  }
  if (!customerId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Stripe customer not found');
  }

  // Get default saved payment method
  const customer =
    await StripeService.getStripe().customers.retrieve(customerId);
  const defaultPaymentMethod = (customer as any)?.invoice_settings
    ?.default_payment_method;

  if (!defaultPaymentMethod) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No saved card found');
  }

  const paymentIntent = await StripeService.getStripe().paymentIntents.create({
    amount: Math.round(payment.amount * 100),
    currency: 'usd',
    customer: customerId,
    payment_method: defaultPaymentMethod as string,
    off_session: true,
    confirm: true,
    metadata: {
      paymentId: payment.id,
      bookingId: bookings.id,
    },
  });

  if (paymentIntent.status !== 'succeeded') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment  Failed');
  }
  const result = await confirmPayment({
    paymentId: payment.id,
    paymentIntentId: paymentIntent.id,
  });
  return result;

  // // 5. Create Stripe checkout session
  // const baseUrl = `${config.server_url}/payments/confirm-payment`;
  // const redirectUrl = `${baseUrl}?sessionId={CHECKOUT_SESSION_ID}&paymentId=${payment.id}`;

  // const checkoutSession = await StripeService.getCheckoutSession(
  //   { amount: payment.amount, name: 'Service Provider Booking', quantity: 1 },
  //   redirectUrl, // success_url
  //   redirectUrl, // cancel_url (same as original)
  //   customerId as string,
  // );

  // if (!checkoutSession?.url)
  //   throw new AppError(
  //     httpStatus.BAD_REQUEST,
  //     'Failed to create checkout session',
  //   );

  // return checkoutSession.url;
};

const confirmPayment = async (payload: {
  paymentId: string;
  paymentIntentId: string;
}) => {
  const { paymentId, paymentIntentId } = payload;

  const stripe = StripeService.getStripe();

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== 'succeeded') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment not successful');
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
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment not found');
    }

    if (isPaymentHave.status !== PAYMENT_STATUS.pending) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment already processed');
    }

    const charge = await StripeService.getStripe().charges.retrieve(
      paymentIntent.latest_charge as string,
    );

    if (charge?.refunded) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment has been refunded');
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
    console.log(chargeDetails);
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
            transactionId: paymentIntent.id as string,
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
          transactionId: paymentIntent?.id as string,
          paymentMethod: chargeDetails.paymentMethod,
          paidAt: paymentDate,
          nextPaymentDate: moment(isPaymentHave.booking.startDate)
            .add(1, 'weeks')
            .toDate(),
          booking: {
            update: {
              status: BookingStatus.ongoing,
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

    return isPaymentHave;
  } catch (error: any) {
    if (paymentIntentId) {
      try {
        const stripe = StripeService.getStripe();

        const paymentIntent =
          await stripe.paymentIntents.retrieve(paymentIntentId);

        const chargeId = paymentIntent.latest_charge as string;

        if (chargeId) {
          const charge = await stripe.charges.retrieve(chargeId);

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
};
