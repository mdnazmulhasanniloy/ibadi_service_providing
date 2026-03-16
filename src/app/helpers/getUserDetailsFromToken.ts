import * as jwt from 'jsonwebtoken';
import httpStatus from 'http-status'; 
import prisma from '@app/shared/prisma.js';
import AppError from '@app/error/AppError.js';
import config from '@app/config/index.js';

const getUserDetailsFromToken = async (token: string) => {
  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'you are not authorized!');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decode: any = await jwt.verify(
    token as string,
    config.jwt_access_secret as string,
  );
  const user = await prisma.user.findUnique({
    where: { id: decode.id },
    select: { id: true, email: true, role: true, profile: true, name: true },
  });

  return user;
};

export default getUserDetailsFromToken;
