import firebaseAdmin from '@app/utils/firebase.js';
import bcrypt from 'bcrypt';
import jwt, { type Secret, type JwtPayload } from 'jsonwebtoken';

export const isPasswordMatched = async (
  plainTextPassword: string,
  hashedPassword: string,
) => {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

export const createToken = (
  jwtPayload: JwtPayload,
  secret: Secret,
  expiresIn: string,
): string => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  return jwt.sign(jwtPayload, secret, { expiresIn });
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret) as JwtPayload;
};

export const isValidFcmToken = async (token: string) => {
  try {
    console.log(token);
    const notify = await firebaseAdmin.messaging().send({
      token,
      notification: {
        title: 'Login Alert!',
        body: 'New Device Login Successfully!',
      },
    });

    console.log(notify);
    return true;  
  } catch (err: any) {
    console.log('🚀 ~ isValidFcmToken ~ err:', err);
    if (
      err.code === 'messaging/invalid-registration-token' ||
      err.code === 'messaging/registration-token-not-registered'
    ) {
      return false;  
    }

    return false;
  }
};
