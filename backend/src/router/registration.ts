import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import { registerUser } from '../registration/index.js';

export const registrationRouter = router({
  register: publicProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(3)
          .max(50)
          .regex(/^[a-z0-9-]+$/, 'Username must be lowercase alphanumeric with hyphens'),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await registerUser(
          input.username,
          input.password,
          ctx.participant,
          ctx.keycloak
        );
      } catch (e) {
        const cause = e instanceof Error && e.cause instanceof Error ? e.cause.message : ''
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: e instanceof Error ? `${e.message}${cause ? `: ${cause}` : ''}` : 'Registration failed',
        });
      }
    }),
});
