import { othersTaskOptionsRoutes } from './../module/othersTaskOptions/othersTaskOptions.route.js';
import { Router } from 'express';
import { userRoutes } from '@app/module/users/users.routes.js';
import { otpRoutes } from '@app/module/otp/otp.routes.js';
import { authRoutes } from '@app/module/auth/auth.route.js';
import { contentsRoutes } from '@app/module/contents/contents.route.js';
import { notificationRoutes } from '@app/module/notification/notification.route.js';
import { workScheduleRoutes } from '@app/module/workSchedule/workSchedule.route.js';
import { categoryRoutes } from '@app/module/category/category.route.js';
import { bookingsRoutes } from '@app/module/bookings/bookings.route.js';
import { reviewsRoutes } from '@app/module/reviews/reviews.route.js';
import { chatRoutes } from '@app/module/chat/chat.route.js';
import { stripeRoutes } from '@app/module/stripe/stripe.route.js';
import { paymentsRoutes } from '@app/module/payments/payments.route.js';
import { experienceOptionsRoutes } from '@app/module/experienceOptions/experienceOptions.route.js';
import { faqRoutes } from '@app/module/faq/faq.route.js';
import { favoritesRoutes } from '@app/module/favorites/favorites.route.js';
import { homepageRoutes } from '@app/module/homepage/homepage.route.js';
import { callHistoryRoutes } from '@app/module/callHistory/callHistory.route.js';
import { addressRoutes } from '@app/module/address/address.route.js';
import { verificationRequestRoutes } from '@app/module/verificationRequest/verificationRequest.route.js';
import { servicesRoutes } from '@app/module/services/services.route.js';
import { clientReviewRoutes } from '@app/module/clientReview/clientReview.route.js';
import { packagesRoutes } from '@app/module/packages/packages.route.js';
import { subscriptionsRoutes } from '@app/module/subscriptions/subscriptions.route.js';

const router: Router = Router();

const moduleRoutes = [
  {
    path: '/subscriptions',
    route: subscriptionsRoutes,
  },
  {
    path: '/packages',
    route: packagesRoutes,
  },
  {
    path: '/client-review',
    route: clientReviewRoutes,
  },
  {
    path: '/services',
    route: servicesRoutes,
  },
  {
    path: '/verification-request',
    route: verificationRequestRoutes,
  },
  {
    path: '/address',
    route: addressRoutes,
  },
  {
    path: '/call-history',
    route: callHistoryRoutes,
  },
  {
    path: '/favorites',
    route: favoritesRoutes,
  },
  {
    path: '/homepage',
    route: homepageRoutes,
  },
  {
    path: '/faq',
    route: faqRoutes,
  },
  {
    path: '/others-task-options',
    route: othersTaskOptionsRoutes,
  },
  {
    path: '/experience-options',
    route: experienceOptionsRoutes,
  },

  {
    path: '/payments',
    route: paymentsRoutes,
  },
  {
    path: '/stripe',
    route: stripeRoutes,
  },
  {
    path: '/chat',
    route: chatRoutes,
  },
  {
    path: '/reviews',
    route: reviewsRoutes,
  },
  {
    path: '/bookings',
    route: bookingsRoutes,
  },

  {
    path: '/workSchedule',
    route: workScheduleRoutes,
  },
  {
    path: '/categories',
    route: categoryRoutes,
  },
  {
    path: '/notifications',
    route: notificationRoutes,
  },
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/otp',
    route: otpRoutes,
  },
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/contents',
    route: contentsRoutes,
  },
];
moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
