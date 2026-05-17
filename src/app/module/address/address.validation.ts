import { z } from 'zod';

export const schema = z.object({
  addressLine1: z
    .string({
      error: 'addressLine1 is required',
    })
    .min(1, 'addressLine1 cannot be empty')
    .optional(),

  addressLine2: z.string().optional(),

  city: z
    .string({
      error: 'city is required',
    })
    .optional(),

  state: z.string().optional(),

  postalCode: z
    .string({
      error: 'postalCode is required',
    })
    .optional(),

  country: z
    .string({
      error: 'country is required',
    })
    .optional(),
});

const create = z.object({
  body: schema,
});
const update = z.object({
  body: schema.partial(),
});

export const AddressValidation = {
  create,
  update,
};
