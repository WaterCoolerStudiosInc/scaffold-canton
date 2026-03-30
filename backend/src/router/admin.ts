// src/router/admin.ts
import { z } from 'zod';
import { router, adminProcedure } from '../trpc.js';
import { buildCreateRules, buildUpdateInstruments, getRules } from '../domain/rules.js';
import { buildMintHolding } from '../domain/holdings.js';
import { buildCreatePreapproval } from '../domain/transfers.js';
import { randomUUID } from 'crypto';

const instrumentIdSchema = z.object({ admin: z.string(), id: z.string() });

export const adminRouter = router({
  createRules: adminProcedure
    .input(z.object({ supportedInstruments: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const command = buildCreateRules(ctx.partyId, input.supportedInstruments);
      return ctx.ledger.submit([ctx.partyId], [command], randomUUID());
    }),

  getRules: adminProcedure.query(async ({ ctx }) => {
    return getRules(ctx.pqs, ctx.partyId);
  }),

  updateInstruments: adminProcedure
    .input(
      z.object({
        rulesContractId: z.string(),
        supportedInstruments: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const commands = buildUpdateInstruments(
        input.rulesContractId,
        ctx.partyId,
        input.supportedInstruments
      );
      return ctx.ledger.submit([ctx.partyId], commands, randomUUID());
    }),

  mintHolding: adminProcedure
    .input(
      z.object({
        owner: z.string(),
        instrumentId: instrumentIdSchema,
        amount: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const command = buildMintHolding(
        ctx.partyId,
        input.owner,
        input.instrumentId,
        input.amount
      );
      return ctx.ledger.submit(
        [ctx.partyId, input.owner],
        [command],
        randomUUID()
      );
    }),

  createPreapproval: adminProcedure
    .input(
      z.object({
        receiver: z.string(),
        instrumentId: instrumentIdSchema,
        expiresAt: z.string().nullable().default(null),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const command = buildCreatePreapproval(
        ctx.partyId,
        input.receiver,
        input.instrumentId,
        input.expiresAt
      );
      return ctx.ledger.submit(
        [ctx.partyId, input.receiver],
        [command],
        randomUUID()
      );
    }),
});
