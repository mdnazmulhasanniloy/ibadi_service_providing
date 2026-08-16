
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status'; 
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import { deleteFromS3 } from '@app/utils/s3.js';



//Create Function
const createSubCategories = async (payload:Prisma.SubcategoriesUncheckedCreateInput) => {
  const categoryId = payload.categoryId as string;
  const category = await prisma.categories.findFirst({
    where: { id: categoryId, isDeleted: false },
    select: { id: true },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  }

  const isExist = await prisma.subcategories.findFirst({
    where: {
      name: payload.name,
    },
  });

  if (isExist && !isExist.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Sub category already exists');
  }

  if (isExist && isExist.isDeleted) {
    const result = await prisma.subcategories.update({
      where: {
        id: isExist.id,
      },
      data: {
        ...payload,
        isDeleted: false,
      },
    });
    return result;
  }

  const result = await prisma.subcategories.create({
    data: payload,
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create sub category');
  }

  return result;
};

/*
get all function
*/
const getAllSubCategories = async (query: Record<string, any>) => {
 query.isDeleted = false;
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

    const where: Prisma.SubcategoriesWhereInput = {};

    /*
    * enter here search input filed
    */
     if (searchTerm) {
    where.OR = ['name'].map(field => ({
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
  
    const orderBy: Prisma.SubcategoriesOrderByWithRelationInput[] = sort
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
    const data = await prisma.subcategories.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: { category: true },
    });

    const total = await prisma.subcategories.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }




};

const getSubCategoriesById = async (id: string) => {

    const result = await prisma.subcategories.findUnique({
      where: {
        id,
      },
      include: { category: true },
    });

     if (!result || result?.isDeleted) 
    throw new AppError(httpStatus.NOT_FOUND,'Subcategory not found!');
  

    return result;
};



// update 
const updateSubCategories = async (id: string, payload:Prisma.SubcategoriesUncheckedUpdateInput ) => {
  const oldSubCategory = await getSubCategoriesById(id);

  if (payload.categoryId) {
    const category = await prisma.categories.findFirst({
      where: { id: payload.categoryId as string, isDeleted: false },
      select: { id: true },
    });
    if (!category) {
      throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
    }
  }

 const result = await prisma.subcategories.update({
      where: {
        id,
      },
      data: payload,
    });

    if (!result) 
      throw new AppError(httpStatus.BAD_REQUEST,'Failed to update SubCategories');
    

    if (payload.image && oldSubCategory.image !== payload.image) {
      const oldKey = new URL(oldSubCategory.image).pathname.replace(/^\/+/, '');
      await deleteFromS3(oldKey);
    }

    return result; 
};

const deleteSubCategories = async (id: string) => {
 const oldSubCategory = await getSubCategoriesById(id);

 const result = await prisma.subcategories.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
      },
    });

 
  if (!result) 
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete subCategories');

  if (oldSubCategory.image) {
    const oldKey = new URL(oldSubCategory.image).pathname.replace(/^\/+/, '');
    await deleteFromS3(oldKey);
  }
 
  return result;
};

export const subCategoriesService = {
  createSubCategories,
  getAllSubCategories,
  getSubCategoriesById,
  updateSubCategories,
  deleteSubCategories,
};
