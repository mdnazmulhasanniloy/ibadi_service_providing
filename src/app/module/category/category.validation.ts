import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),

  description: z.string().optional().nullable(),

  image: z.string().url('Image must be a valid URL').optional().nullable(),

  sortOrder: z.number().int().nonnegative().default(0),

  status: z.boolean().default(true),

  isDeleted: z.boolean().default(false),
});

const create = z.object({
  body: categorySchema,
});
const update = z.object({
  body: categorySchema.partial(),
});
const categoryValidation = {
  create,
  update,
};
export default categoryValidation;
