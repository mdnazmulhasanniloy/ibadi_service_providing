import crypto from 'crypto';
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import AppError from '@app/error/AppError.js';
import { generateAgoraToken } from './agora.utils.js';
import config from '@app/config/index.js';
 

//Create Function
const numericAgoraUid = (userId: string) => {
  const digest = crypto.createHash('sha256').update(userId).digest();
  return (digest.readUInt32BE(0) & 0x7fffffff) || 1;
};

const generateToken = async (callId: string, userId: string) => {
  if (!config.agora.appId || !config.agora.appCertificate) {
    throw new AppError(httpStatus.SERVICE_UNAVAILABLE, 'Agora is not configured');
  }
  const call = await prisma.callHistory.findFirst({
    where: {
      id: callId,
      OR: [{ senderId: userId }, { receiverId: userId }],
      status: { in: ['ringing', 'accepted'] },
    },
  });
  if (!call) {
    throw new AppError(httpStatus.FORBIDDEN, 'Call not found or access denied');
  }
  const uid = numericAgoraUid(userId);
  return {
    token: generateAgoraToken(call.channelName, uid),
    appId: config.agora.appId,
    channelName: call.channelName,
    uid,
    expiresIn: 3600,
  };
};

export const agoraService = {
  generateToken,
};
