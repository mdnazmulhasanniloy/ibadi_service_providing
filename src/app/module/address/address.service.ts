
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status'; 
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';



//Create Function
const createAddress = async (payload:Prisma.AddressCreateInput) => {
  const result = await prisma.address.create({
      data: payload,
    });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create address');
  }
  return result;
};

/*
get all function
*/
const getAllAddress = async (query: Record<string, any>) => {
 query.isDeleted = false;
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

    const where: Prisma.AddressWhereInput = {};

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
  
    const orderBy: Prisma.AddressOrderByWithRelationInput[] = sort
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
    const data = await prisma.address.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.address.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }




};

const getAddressById = async (id: string) => {

 try {
    const result = await prisma.address.findUnique({
      where: {
        id,
      },
    });

     if (!result || result?.isDeleted) 
    throw new AppError(httpStatus.BAD_REQUEST,'Address not found!');
  

    return result;
  } catch (error: any)  {
   
  throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
   
};



// update 
const updateAddress = async (id: string, payload:Prisma.AddressUpdateInput ) => {
 const result = await prisma.address.update({
      where: {
        id,
      },
      data: payload,
    });

    if (!result) 
      throw new AppError(httpStatus.BAD_REQUEST,'Failed to update Address');
    

    return result; 
};

const deleteAddress = async (id: string) => {

 const result = await prisma.address.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
      },
    });

 
  if (!result) 
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete address');
 
  return result;
};

export const addressService = {
  createAddress,
  getAllAddress,
  getAddressById,
  updateAddress,
  deleteAddress,
};