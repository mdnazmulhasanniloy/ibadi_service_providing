/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import { sendEmail } from '@app/utils/mailSender.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//Create Function
const createSupportMessage = async (
  payload: Prisma.SupportMessageCreateInput,
) => {
  const result = await prisma.supportMessage.create({
    data: payload,
  });

  if (!result) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to create supportMessage',
    );
  }

  const admin = await prisma.user.findFirst({
    where: {
      role: 'admin',
    },
  });
  if (admin) {
    const otpEmailPath = path.join(
      __dirname,
      '../../../../public/view/support.html',
    );

    //   await sendEmail(
    //     // admin?.email,
    //     'mdnazmulhasanniloy323@gmail.com',
    //     'New Support Message',
    //     fs
    //       .readFileSync(otpEmailPath, 'utf8')
    //       .replace('{{name}}', result?.name)
    //       .replace('{{email}}', result?.email)
    //       .replace('{{subject}}', result?.subject)
    //       .replace('{{message}}', result?.message)
    //       .replace('{{createdAt}}', result?.createdAt.toLocaleString()),
    //   );
    // }

    await sendEmail(
      admin?.email,
      // 'mdnazmulhasanniloy323@gmail.com',
      'New Support Message',
      fs
        .readFileSync(otpEmailPath, 'utf8')
        .replace(/{{name}}/g, result?.name)
        .replace(/{{email}}/g, result?.email)
        .replace(/{{subject}}/g, result?.subject)
        .replace(/{{message}}/g, result?.message)
        .replace(/{{createdAt}}/g, result?.createdAt.toLocaleString()),
    );
  }
  return result;
};

/*
get all function
*/
const getAllSupportMessage = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  const where: Prisma.SupportMessageWhereInput = {};

  /*
   * enter here search input filed
   */
  if (searchTerm) {
    where.OR = ['name', 'email', 'subject'].map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    }));
  }

  // Filter conditions
  if (Object.keys(filtersData).length > 0) {
    const oldAnd = where.AND;
    const andArray = Array.isArray(oldAnd) ? oldAnd : oldAnd ? [oldAnd] : [];

    where.AND = [
      ...andArray,
      ...Object.entries(filtersData).map(([key, value]) => ({
        [key]: { equals: value },
      })),
    ];
  }

  // Pagination & Sorting
  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  const orderBy: Prisma.SupportMessageOrderByWithRelationInput[] = sort
    ? sort.split(',').map(field => {
        const trimmed = field.trim();
        if (trimmed.startsWith('-')) {
          return { [trimmed.slice(1)]: 'desc' };
        }
        return { [trimmed]: 'asc' };
      })
    : [];

  try {
    // Fetch data
    const data = await prisma.supportMessage.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.supportMessage.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

const getSupportMessageById = async (id: string) => {
  try {
    const result = await prisma.supportMessage.findUnique({
      where: {
        id,
      },
    });

    if (!result)
      throw new AppError(httpStatus.BAD_REQUEST, 'SupportMessage not found!');

    return result;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
};

// update
const updateSupportMessage = async (
  id: string,
  payload: Prisma.SupportMessageUpdateInput,
) => {
  const result = await prisma.supportMessage.update({
    where: {
      id,
    },
    data: payload,
  });

  if (!result)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to update SupportMessage',
    );

  return result;
};

const deleteSupportMessage = async (id: string) => {
  const result = await prisma.supportMessage.delete({
    where: {
      id,
    },
  });

  if (!result)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to delete supportMessage',
    );

  return result;
};

export const supportMessageService = {
  createSupportMessage,
  getAllSupportMessage,
  getSupportMessageById,
  updateSupportMessage,
  deleteSupportMessage,
};
