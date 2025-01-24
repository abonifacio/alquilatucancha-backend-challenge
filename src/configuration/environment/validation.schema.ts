import { z } from 'nestjs-zod/z';

export const validationSchema = z.object({
  REDIS_HOST: z.string().nonempty('REDIS_HOST is required'),
  REDIS_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, {
      message: 'REDIS_PORT must be a valid positive number',
    }),
});
