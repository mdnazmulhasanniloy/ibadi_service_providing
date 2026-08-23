import httpStatus from 'http-status';
import type { Request } from 'express';
import { UAParser } from 'ua-parser-js';
import bcrypt from 'bcrypt';
import moment from 'moment';
import path from 'path';
import fs from 'fs';
import prisma from '@app/shared/prisma.js';
import AppError from '@app/error/AppError.js';
import {
  createToken,
  isPasswordMatched,
  isValidFcmToken,
  verifyToken,
} from './user.utils.js';
import config from '@app/config/index.js';
import { generateOtp } from '@app/utils/otpGenerator.js';
import { sendEmail } from '@app/utils/mailSender.js';
import type {
  IChangePassword,
  IGoogleLogin,
  IJwtPayload,
  ILogin,
  IResetPassword,
} from './auth.interface.js';
import { fileURLToPath } from 'url';
import firebaseAdmin from '@app/utils/firebase.js';
import {
  Login_With,
  Role,
  status,
} from '../../../../generated/prisma/index.js';
import { notificationQueue } from '@app/redis/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const login = async (payload: ILogin, req: Request) => {
  console.log('🚀 ~ login ~ payload:', payload);
  payload.email = payload?.email?.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      email: payload.email,
    },
    include: {
      verification: {
        select: {
          status: true,
        },
      },
    },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    '';

  const parser = new UAParser(req.headers['user-agent']);
  const result = parser.getResult();

  const browser = result.browser.name || 'Unknown';
  const os = result.os.name || 'Unknown';
  const device = result.device.model || 'Desktop';

  if (user?.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
  }

  //   if (user?.registerWith !== REGISTER_WITH.credentials) {
  //     throw new AppError(
  //       httpStatus.BAD_REQUEST,
  //       `This account is registered with ${user.registerWith}, so you should try logging in using that method.`,
  //     );
  //   }

  if (!(await isPasswordMatched(payload.password, user.password as string))) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password does not match');
  }

  if (!user?.verification?.status) {
    throw new AppError(httpStatus.FORBIDDEN, 'User account is not verified');
  }

  const isIOS =
    os.toLowerCase().includes('ios') ||
    device.toLowerCase().includes('iphone') ||
    device.toLowerCase().includes('ipad');

  if (!isIOS && payload.fcmToken)
    if (!(await isValidFcmToken(payload?.fcmToken)))
      throw new AppError(httpStatus.BAD_REQUEST, 'FCM Token is invalid');

  const jwtPayload: { userId: string; role: string } = {
    userId: user?.id?.toString() as string,
    role: user?.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string,
  );

  const newUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      fcmToken: payload?.fcmToken ?? null,
      deviceHistory: {
        create: {
          ip,
          browser: result.browser.name,
          os: result.os.name,
          device: result.device.model || 'Desktop',
        },
      },
    },
    include: {
      deviceHistory: true,
    },
  });

  return {
    user: newUser,
    accessToken,
    refreshToken,
  };
};

const changePassword = async (id: string, payload: IChangePassword) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (
    !(await isPasswordMatched(payload?.oldPassword, user.password as string))
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Old password does not match');
  }
  if (payload?.newPassword !== payload?.confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'New password and confirm password do not match',
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload?.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const result = await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
    },
  });

  return result;
};

const forgotPassword = async (email: string) => {
  const user = await prisma.user.findFirst({
    where: { email },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user?.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const jwtPayload = {
    email: email,
    userId: user?.id,
  };

  const token = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    '3m',
  );

  const currentTime = new Date();
  const otp = generateOtp();
  const expiresAt = moment(currentTime).add(3, 'minute');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verification: {
        update: {
          otp: Number(otp),
          expiredAt: expiresAt.toDate(),
        },
      },
    },
  });

  const otpEmailPath = path.join(
    __dirname,
    '../../../../public/view/forgot_pass_mail.html',
  );

  await sendEmail(
    user?.email,
    'Your reset password OTP is',
    fs
      .readFileSync(otpEmailPath, 'utf8')
      .replace('{{otpCode}}', otp)
      .replace('{{email}}', user?.email),
  );
  return { email, token };
};

// Reset password
const resetPassword = async (token: string, payload: IResetPassword) => {
  let decode;
  try {
    decode = verifyToken(token, config.jwt_access_secret as string);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err: any) {
    console.log(err);
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Session has expired. Please try again',
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: decode?.userId },
    include: {
      verification: {
        select: {
          status: true,
          expiredAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // if (new Date() > (user?.verification?.expiredAt as Date)) {
  //   throw new AppError(httpStatus.FORBIDDEN, 'Session has expired');
  // }

  if (!user?.verification?.status) {
    throw new AppError(httpStatus.FORBIDDEN, 'OTP is not verified yet');
  }

  if (payload?.newPassword !== payload?.confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'New password and confirm password do not match',
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload?.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const result = await prisma.user.update({
    where: { id: decode?.userId },
    data: {
      password: hashedPassword,
      verification: {
        update: {
          otp: 0,
          status: true,
        },
      },
    },
  });

  return result;
};

const refreshToken = async (token: string) => {
  // Checking if the given token is valid
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);
  const { userId } = decoded;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      verification: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  const isDeleted = user?.isDeleted;

  if (isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
  }

  const jwtPayload: IJwtPayload = {
    userId: user?.id?.toString() as string,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  return {
    accessToken,
  };
};

const googleLogin = async (payload: IGoogleLogin, req: Request) => {
  const decodedToken = await firebaseAdmin.auth().verifyIdToken(payload.token);

  if (!decodedToken.email_verified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Google email not verified');
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: decodedToken.email!,
    },
    include: {
      verification: true,
      deviceHistory: true,
    },
  });

  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    '';

  const parser = new UAParser(req.headers['user-agent']);
  const result = parser.getResult();

  const browser = result.browser.name || 'Unknown';
  const os = result.os.name || 'Unknown';
  const device = result.device.model || 'Desktop';

  // LOGIN
  if (existingUser) {
    if (existingUser.isDeleted)
      throw new AppError(httpStatus.FORBIDDEN, 'Account deleted');

    if (existingUser.status !== status.active)
      throw new AppError(httpStatus.FORBIDDEN, 'Account blocked');

    let loggedInUser = existingUser;

    if (payload.fcmToken) {
      if (!(await isValidFcmToken(payload.fcmToken))) {
        throw new AppError(httpStatus.BAD_REQUEST, 'FCM Token is invalid');
      }

      loggedInUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { fcmToken: payload.fcmToken },
        include: {
          verification: true,
          deviceHistory: true,
        },
      });

      const userNotification = {
        data: {
          receiverId: existingUser.id as string,
          message: 'Login Successful',
          description: 'You have successfully logged in.',
        },
      };

      await notificationQueue.add('new_notification', userNotification);
    }

    const jwtPayload = {
      userId: existingUser.id,
      role: existingUser.role,
    };

    return {
      user: loggedInUser,
      accessToken: createToken(
        jwtPayload,
        config.jwt_access_secret!,
        config.jwt_access_expires_in!,
      ),
      refreshToken: createToken(
        jwtPayload,
        config.jwt_refresh_secret!,
        config.jwt_refresh_expires_in!,
      ),
    };
  }

  // REGISTER

  const user = await prisma.user.create({
    data: {
      name: decodedToken.name || 'Google User',
      email: decodedToken.email!,
      profile: decodedToken.picture || null,
      phoneNumber: decodedToken.phone_number || null,
      role: payload.role || Role.user,
      loginWth: Login_With.google,
      fcmToken: payload.fcmToken ?? null,

      verification: {
        create: {
          status: true,
          otp: 0,
          expiredAt: null,
        },
      },
    },
    include: {
      verification: true,
      deviceHistory: true,
    },
  });

  const jwtPayload = {
    userId: user.id,
    role: user.role,
  };

  return {
    user,
    accessToken: createToken(
      jwtPayload,
      config.jwt_access_secret!,
      config.jwt_access_expires_in!,
    ),
    refreshToken: createToken(
      jwtPayload,
      config.jwt_refresh_secret!,
      config.jwt_refresh_expires_in!,
    ),
  };
};

export const authServices = {
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  googleLogin,
  //   registerWithGoogle,
  //   registerWithFacebook,
};
