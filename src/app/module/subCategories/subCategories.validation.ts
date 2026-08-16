import { z } from 'zod';

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Category ID must be a valid ObjectId');

const subCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  categoryId: objectId,
  image: z.string().url('Image must be a valid URL'),
});

const create = z.object({
  body: subCategorySchema,
});

const update = z.object({
  body: subCategorySchema.partial().refine(body => Object.keys(body).length > 0, {
    message: 'At least one field is required',
  }),
});

const subCategoriesValidation = { create, update };

export default subCategoriesValidation;
