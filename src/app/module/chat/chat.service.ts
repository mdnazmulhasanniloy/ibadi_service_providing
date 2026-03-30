
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status'; 
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';

 

// update 
const update = async (id: string, payload: Prisma.ChatUpdateInput) => {
  const result = await prisma.chat.update({
    where: {
      id,
    },
    data: payload,
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Chat');

  return result;
};
 
 

export const chatService = {
  update, 
};