import { z } from 'zod';

export const createCallHistorySchema = z.object({
  body: z.object({
    receiverId: z
      .string({
        error: 'receiverId is required',
      })
      .min(1, 'receiverId cannot be empty'),
    type: z.enum(['audio_call', 'video_call']).default('audio_call'),
  }),
});
