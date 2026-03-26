import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
const capitalizeFirstLetter = text => {
  const [first = '', ...rest] = text;
  return [first.toUpperCase(), ...rest].join('');
};
// -------------------------------------------------------------
// ⭐ NEW FUNCTION: Auto Update app/routes/index.ts
// -------------------------------------------------------------
function updateMainRouteFile(folderName) {
  const routeFilePath = path.join('src', 'app', 'routes', 'routes.ts');
  let content = fs.readFileSync(routeFilePath, 'utf8');
  const importLine = `import { ${folderName}Routes } from "../modules/${folderName}/${folderName}.route";`;
  // Add import line if missing
  if (!content.includes(importLine)) {
    content = content.replace(
      /const router = Router\(\);/,
      `${importLine}\n\nconst router = Router();`,
    );
  }
  const routeObject = `  {\n    path: "/${folderName}",\n    route: ${folderName}Routes,\n  },`;
  // Add route object inside moduleRoutes array
  if (!content.includes(`path: "/${folderName}"`)) {
    content = content.replace(
      /const moduleRoutes = \[/,
      `const moduleRoutes = [\n${routeObject}`,
    );
  }
  fs.writeFileSync(routeFilePath, content, 'utf8');
  console.log(`✔ Route added to index.ts for: ${folderName}`);
}
// -------------------------------------------------------------
// ⭐ Function to create folder & auto-generate files
// -------------------------------------------------------------
// Function to create the folder and files
const createFolderAndFiles = (parentFolderPath, folderName) => {
  const folderPath = path.join(parentFolderPath, folderName);
  // fs.mkdirSync(folderPath);
  fs.mkdirSync(folderPath, { recursive: true });
  const files = [
    `${folderName}.constants.ts`,
    `${folderName}.controller.ts`,
    `${folderName}.route.ts`,
    `${folderName}.service.ts`,
    `${folderName}.utils.ts`,
    `${folderName}.validation.ts`,
  ];
  files.forEach(file => {
    const filePath = path.join(folderPath, file);
    let content = '';
    if (file === `${folderName}.service.ts`) {
      content = `
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status'; 
import prisma from '@app/shared/prisma.js';
import type { Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';



//Create Function
const create${capitalizeFirstLetter(folderName)} = async (payload:Prisma.${capitalizeFirstLetter(folderName)}CreateInput) => {
  const result = await prisma.${folderName}.create({
      data: payload,
    });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create ${folderName}');
  }
  return result;
};

/*
get all function
*/
const getAll${capitalizeFirstLetter(folderName)} = async (query: Record<string, any>) => {
 query.isDeleted = false;
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

    const where: Prisma.${capitalizeFirstLetter(folderName)}WhereInput = {};

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
  
    const orderBy: Prisma.${capitalizeFirstLetter(folderName)}OrderByWithRelationInput[] = sort
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
    const data = await prisma.${folderName}.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    const total = await prisma.${folderName}.count({ where });

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }




};

const get${capitalizeFirstLetter(folderName)}ById = async (id: string) => {

 try {
    const result = await prisma.${folderName}.findUnique({
      where: {
        id,
      },
    });

     if (!result || result?.isDeleted) 
    throw new AppError(httpStatus.BAD_REQUEST,'${capitalizeFirstLetter(folderName)} not found!');
  

    return result;
  } catch (error: any)  {
   
  throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  }
   
};



// update 
const update${capitalizeFirstLetter(folderName)} = async (id: string, payload:Prisma.${capitalizeFirstLetter(folderName)}UpdateInput ) => {
 const result = await prisma.${folderName}.update({
      where: {
        id,
      },
      data: payload,
    });

    if (!result) 
      throw new AppError(httpStatus.BAD_REQUEST,'Failed to update ${capitalizeFirstLetter(folderName)}');
    

    return result; 
};

const delete${capitalizeFirstLetter(folderName)} = async (id: string) => {

 const result = await prisma.${folderName}.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
      },
    });

 
  if (!result) 
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete ${folderName}');
 
  return result;
};

export const ${folderName}Service = {
  create${capitalizeFirstLetter(folderName)},
  getAll${capitalizeFirstLetter(folderName)},
  get${capitalizeFirstLetter(folderName)}ById,
  update${capitalizeFirstLetter(folderName)},
  delete${capitalizeFirstLetter(folderName)},
};`;
    } else if (file === `${folderName}.controller.ts`) {
      content = `
import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import catchAsync from '@app/utils/catchAsync.js'; 
import { ${folderName}Service } from './${folderName}.service'; 
import sendResponse from '@app/utils/sendResponse.js';



const create${capitalizeFirstLetter(folderName)} = catchAsync(async (req: Request, res: Response) => {
 const result = await ${folderName}Service.create${capitalizeFirstLetter(folderName)}(req.body);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: '${capitalizeFirstLetter(folderName)} created successfully',
    data: result,
  });

});

const getAll${capitalizeFirstLetter(folderName)} = catchAsync(async (req: Request, res: Response) => {

 const result = await ${folderName}Service.getAll${capitalizeFirstLetter(folderName)}(req.query);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: 'All ${folderName} fetched successfully',
    data: result,
  });

});

const get${capitalizeFirstLetter(folderName)}ById = catchAsync(async (req: Request, res: Response) => {
 const result = await ${folderName}Service.get${capitalizeFirstLetter(folderName)}ById(req.params.id);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: '${capitalizeFirstLetter(folderName)} fetched successfully',
    data: result,
  });

});
const update${capitalizeFirstLetter(folderName)} = catchAsync(async (req: Request, res: Response) => {
const result = await ${folderName}Service.update${capitalizeFirstLetter(folderName)}(req.params.id, req.body);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: '${capitalizeFirstLetter(folderName)} updated successfully',
    data: result,
  });

});


const delete${capitalizeFirstLetter(folderName)} = catchAsync(async (req: Request, res: Response) => {
 const result = await ${folderName}Service.delete${capitalizeFirstLetter(folderName)}(req.params.id);
  sendResponse(res, {
   statusCode: httpStatus.OK,
    success: true,
    message: '${capitalizeFirstLetter(folderName)} deleted successfully',
    data: result,
  });

});

export const ${folderName}Controller = {
  create${capitalizeFirstLetter(folderName)},
  getAll${capitalizeFirstLetter(folderName)},
  get${capitalizeFirstLetter(folderName)}ById,
  update${capitalizeFirstLetter(folderName)},
  delete${capitalizeFirstLetter(folderName)},
};`;
    } else if (file === `${folderName}.route.ts`) {
      content = `
import { Router } from 'express';
import { ${folderName}Controller } from './${folderName}.controller.js';

const router: Router = Router();

router.post('/', ${folderName}Controller.create${capitalizeFirstLetter(folderName)});
router.patch('/:id', ${folderName}Controller.update${capitalizeFirstLetter(folderName)});
router.delete('/:id', ${folderName}Controller.delete${capitalizeFirstLetter(folderName)});
router.get('/:id', ${folderName}Controller.get${capitalizeFirstLetter(folderName)}ById);
router.get('/', ${folderName}Controller.getAll${capitalizeFirstLetter(folderName)});

export const ${folderName}Routes = router;`;
    }
    fs.writeFileSync(filePath, content, 'utf8');
  });
  console.log(`Folder "${folderName}" and files created successfully.`);
  updateMainRouteFile(folderName);
};
const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});
readline.question('Enter folder name: ', folderName => {
  createFolderAndFiles('src/app/modules', folderName);
  readline.close();
});
//# sourceMappingURL=generateFolder.js.map
