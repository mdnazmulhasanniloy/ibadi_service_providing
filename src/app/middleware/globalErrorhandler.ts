/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import type { TErrorSources } from '@app/interface/error.js';
import handleZodError from '@app/error/ZodError.js';
import handleDuplicateError from '@app/error/DuplicateError.js';
import handlePrismaValidationError from '@app/error/PrismaValidationError.js';
import handlePrismaKnownError from '@app/error/PrismaKnownError.js';
import AppError from '@app/error/AppError.js';
import handelMulterError from '@app/error/MulterError.js';
import config from '@app/config/index.js'; 
import { Prisma } from '../../../generated/prisma/index.js';

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  //setting default values
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorSources: TErrorSources = [
    {
      path: '',
      message: 'Something went wrong',
    },
  ];

  if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    const simplifiedError = handleDuplicateError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    const simplifiedError = handlePrismaValidationError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Duplicate
    if (err.code === 'P2002') {
      const simplifiedError = handleDuplicateError(err);
      statusCode = simplifiedError.statusCode;
      message = simplifiedError.message;
      errorSources = simplifiedError.errorSources;
    }
    // Other validation / constraint errors
    else {
      const simplifiedError = handlePrismaKnownError(err);
      statusCode = simplifiedError.statusCode;
      message = simplifiedError.message;
      errorSources = simplifiedError.errorSources;
    }
  } else if (err instanceof AppError) {
    statusCode = err?.statusCode;
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  } else if (err instanceof MulterError) {
    const simplifiedError = handelMulterError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err instanceof Error) {
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  }

  //ultimate return
  if (errorSources?.length !== 0) {
    errorSources = errorSources.map(source => {
      try {
        return {
          ...source,
          message: source?.message,
        };
      } catch (error) {
        return {
          ...source,
          message: source?.message,
        };
      }
    });
    // message = req.t(message);
  }
  try {
    res.status(statusCode).json({
      success: false,
      message: message,
      // message: message,
      errorSources: errorSources,
      err,
      stack: config.NODE_ENV === 'development' ? err?.stack : null,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    res.status(statusCode).json({
      success: false,
      // message: message? req.t(message) : null,
      message: message,
      errorSources,
      err,
      stack: config.NODE_ENV === 'development' ? err?.stack : null,
    });
  }
};

export default globalErrorHandler;
