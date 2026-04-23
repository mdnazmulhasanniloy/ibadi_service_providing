
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status'; 
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';



//Create Function
const createBookings = async (payload:Prisma.BookingsCreateInput) => {
  const result = await prisma.bookings.create({
      data: payload,
    });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create bookings');
  }
  return result;
};

/*
get all function
*/
const getAllBookings = async (query: Record<string, any>) => {
 query.isDeleted = false;
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

    const where: Prisma.BookingsWhereInput = {};

    /*
    * enter here search input filed
    */
     if (searchTerm) {
    where.OR = [].map(field => ({
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
  
    const orderBy: Prisma.BookingsOrderByWithRelationInput[] = sort
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
    const data = await prisma.bookings.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.bookings.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }




};

const getBookingsById = async (id: string) => {

 try {
    const result = await prisma.bookings.findUnique({
      where: {
        id,
      },
    });

     if (!result || result?.isDeleted) 
    throw new AppError(httpStatus.BAD_REQUEST,'Bookings not found!');
  

    return result;
  } catch (error: any)  {
   
  throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
   
};



// update 
const updateBookings = async (id: string, payload:Prisma.BookingsUpdateInput ) => {
 const result = await prisma.bookings.update({
      where: {
        id,
      },
      data: payload,
    });

    if (!result) 
      throw new AppError(httpStatus.BAD_REQUEST,'Failed to update Bookings');
    

    return result; 
};

const deleteBookings = async (id: string) => {

 const result = await prisma.bookings.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
      },
    });

 
  if (!result) 
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete bookings');
 
  return result;
};

export const bookingsService = {
  createBookings,
  getAllBookings,
  getBookingsById,
  updateBookings,
  deleteBookings,
};