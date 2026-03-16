import catchAsync from '@app/utils/catchAsync.js';
import type { Request, Response, NextFunction } from 'express'; 


const parseData = () => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (req?.body?.data) {
      req.body = JSON.parse(req.body.data);
    }

    next();
  });
};
export default parseData;
