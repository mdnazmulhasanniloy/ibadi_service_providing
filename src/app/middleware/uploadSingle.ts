import catchAsync from '@app/utils/catchAsync.js';
import { uploadToS3 } from '@app/utils/s3.js';
import type{ NextFunction, Request, Response } from 'express'; 

const uploadSingle = (name: string) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (req?.file) {
      req.body[`${name}`] = await uploadToS3({
        file: req.file,
        fileName: `images/${name}/${Math.floor(100000 + Math.random() * 900000)}`,
      });
    }

    next();
  });
};

export default uploadSingle;
