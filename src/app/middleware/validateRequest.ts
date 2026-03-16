import catchAsync from '@app/utils/catchAsync.js';
import type { NextFunction, Request, Response } from 'express';
import { ZodObject } from 'zod'; 

const validateRequest = (schema: ZodObject) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await schema.parseAsync({
      body: req.body,
      files: req.files,
      file: req.file,
      cookies: req.cookies,
    });

    next();
  });
};

export default validateRequest;
