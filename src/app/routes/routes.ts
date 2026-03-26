import { Router } from 'express';
import { userRoutes } from '@app/module/users/users.routes.js';
import { otpRoutes } from '@app/module/otp/otp.routes.js';
import { authRoutes } from '@app/module/auth/auth.route.js';
import { contentsRoutes } from '@app/module/contents/contents.route.js';
import { notificationRoutes } from '@app/module/notification/notification.route.js';
import { workScheduleRoutes } from '@app/module/workSchedule/workSchedule.route.js';
import { categoryRoutes } from '@app/module/category/category.route.js';

const router: Router = Router();

const moduleRoutes = [
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
