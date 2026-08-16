import httpStatus, { status } from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js';
import sendResponse from '@app/utils/sendResponse.js';
import { bookingsService } from './bookings.service.js';
import { notificationQueue } from '@app/redis/index.js';
import { BookingStatus } from '../../../../generated/prisma/index.js';

const createBookings = catchAsync(async (req: Request, res: Response) => {
  req.body['userId'] = req.user.userId;
  const result = await bookingsService.createBookings(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bookings created successfully',
    data: result,
  });
});

const getAllBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.getAllBookings(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All bookings fetched successfully',
    data: result,
  });
});

const getUserBookings = catchAsync(async (req: Request, res: Response) => {
  const query = {
    ...req?.query,
    userId: req?.user?.userId,
  };
  const result = await bookingsService.getAllBookings(query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All bookings fetched successfully',
    data: result,
  });
});

const getServiceProviderBookings = catchAsync(
  async (req: Request, res: Response) => {
    const query = {
      ...req?.query,
      providerId: req?.user?.userId,
    };
    const result = await bookingsService.getAllBookings(query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All bookings fetched successfully',
      data: result,
    });
  },
);

const getBookingsById = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.getBookingsById(
    req.params.id as string,
    req.query.include as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bookings fetched successfully',
    data: result,
  });
});

const updateBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.updateBookings(
    req.params.id as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bookings updated successfully',
    data: result,
  });
});
const completeBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.updateBookings(req.params.id as string, {
    status: BookingStatus.complete,
  });

  const io = global?.socketio;
  if (io) {
    io.emit('bookingComplete::' + result?.userId?.toString(), result);
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bookings completed successfully',
    data: result,
  });
});

const acceptBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.approvedRequest(req.params.id as string);

  if (result.userId) {
    const userNotification = {
      data: {
        receiverId: result.userId as string,
        message: 'Booking Request Accepted',
        description:
          'The provider has accepted your booking request. Please check your booking details for more information.',
        bookingId: result.id,
      },
    };
    notificationQueue.add('new_notification', userNotification);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking request accepted successfully',
    data: result,
  });
});

const rejectBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.rejectBookings(req.params.id as string);

  if (result.userId) {
    const userNotification = {
      data: {
        receiverId: result.userId as string,
        message: 'Booking Rejected',
        description:
          'Unfortunately, the provider was unable to accept your booking request at this time.',
        bookingId: result.id,
      },
    };
    notificationQueue.add('new_notification', userNotification);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking request rejected successfully',
    data: result,
  });
});

const canceledBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.canceledBookings(
    req.params.id as string,
  );

  if (result.userId) {
    const userNotification = {
      data: {
        receiverId: result.userId as string,
        message: 'Booking Rejected',
        description:
          'Unfortunately, the provider was unable to accept your booking request at this time.',
        bookingId: result.id,
      },
    };
    notificationQueue.add('new_notification', userNotification);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking request rejected successfully',
    data: result,
  });
});

const getProviderMonthlyAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    const result = await bookingsService.getProviderMonthlyAnalytics(
      req.user.userId,
      req.query.month as string | undefined,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Provider monthly analytics fetched successfully',
      data: result,
    });
  },
);

// const deleteBookings = catchAsync(async (req: Request, res: Response) => {
//   const result = await bookingsService.deleteBookings(req.params.id as string);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: 'Bookings deleted successfully',
//     data: result,
//   });
// });

export const bookingsController = {
  createBookings,
  getAllBookings,
  getUserBookings,
  getServiceProviderBookings,
  updateBookings,
  rejectBookings,
  getBookingsById,
  canceledBookings,
  acceptBookings,
  completeBookings,
  getProviderMonthlyAnalytics,
  // deleteBookings,
};
