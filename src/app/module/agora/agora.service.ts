/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import AppError from '@app/error/AppError.js';
import { generateAgoraToken } from './agora.utils.js';
import config from '@app/config/index.js';
import moment from 'moment';

//Create Function
const generateToken = async (query: Record<string, any>) => {
  const { channelName, uid } = query;
  if (!channelName || !uid)
    throw new AppError(httpStatus.BAD_REQUEST, 'Missing params');
  const token = generateAgoraToken(channelName, Number(uid));

  return { token, appId: config.agora.appId, channelName };
};

const StartCall = async (payload: any) => {
  const { senderId, receiverId, type, channelName } = payload;
  const result = await prisma.callHistory.create({
    data: {
      senderId,
      receiverId,
      type,
      // channelName,
      // status: CALL_STATUS.ongoing,
      // startTime: moment().toDate(),
    },
  });

  return result;
};

const endCall = async (id: string) => {
  const result = await prisma.callHistory.findUnique({ where: { id } });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Call not found');

  // const duration = Math.floor(
  //   (Date.now() - new Date(result.startTime as Date).getTime()) / 1000,
  // );

  // const updatedCall = await prisma.callHistory.update({
  //   where: { id: id },
  //   data: { status: 'completed', endTime: new Date(), duration },
  // });

  // return updatedCall;
};

export const agoraService = {
  generateToken,
  StartCall,
  endCall,
};
