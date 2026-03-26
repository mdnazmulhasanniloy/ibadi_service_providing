import { z } from 'zod';

const schema = z.object({
  userId: z.string().min(1, 'userId ID is required'),

  bookingId: z.string().min(1, 'Booking ID is required'),

  rating: z
    .number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot be more than 5'),

  review: z.string().max(500, 'Review cannot exceed 500 characters').optional(),
});

const create = z.object({
  body: schema,
});
const update = z.object({
  body: schema.partial(),
});

const reviewsValidation = {
  create,
  update,
};
export default reviewsValidation;
