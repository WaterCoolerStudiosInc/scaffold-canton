// src/router/index.ts
import { router, publicProcedure, partyProcedure } from '../trpc.js';
import { adminRouter } from './admin.js';
import { userRouter } from './user.js';
import { registrationRouter } from './registration.js';

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' as const })),
  whoami: partyProcedure.query(async ({ ctx }) => {
    const partyId = ctx.sub
      ? await ctx.participant.getPartyForUser(ctx.sub, ctx.token).catch(() => null) ?? ctx.partyId
      : ctx.partyId;
    return { partyId, isAdmin: ctx.isAdmin };
  }),
  admin: adminRouter,
  user: userRouter,
  registration: registrationRouter,
});

export type AppRouter = typeof appRouter;
