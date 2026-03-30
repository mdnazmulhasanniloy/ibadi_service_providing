import jwt from 'jsonwebtoken';
import { type JwtPayload } from 'jsonwebtoken';
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import AppError from '@app/error/AppError.js';
import config from '@app/config/index.js';

const getUserDetailsFromToken = async (token: string) => {
  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'you are not authorized!');
  }

  try {
    const decode: JwtPayload = jwt.verify(
      token as string,
      config.jwt_access_secret as string,
    ) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decode?.userId },
      select: { id: true, email: true, role: true, profile: true, name: true },
    });
    return user;
  } catch (error) {
    console.log(error);
    throw new AppError(httpStatus.UNAUTHORIZED, 'unauthorized');
  }
};

export default getUserDetailsFromToken;
