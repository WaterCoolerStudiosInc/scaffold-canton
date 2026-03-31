import { z } from 'zod';
import { router, adminProcedure } from '../trpc.js';
import { buildCreateRules, buildUpdateInstruments, getRules } from '../domain/rules.js';
import { buildMintHolding } from '../domain/holdings.js';
import { buildCreatePreapproval } from '../domain/transfers.js';
import { instrumentIdSchema, TEMPLATE_IDS } from '../domain/types.js';
import { randomUUID } from 'crypto';

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

  listParties: adminProcedure
    .input(z.object({ pageToken: z.string().optional(), pageSize: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.participant.listParties(input.pageToken, input.pageSize);
    }),

  getParticipantId: adminProcedure.query(async ({ ctx }) => {
    return { participantId: await ctx.participant.getParticipantId() };
  }),

  listUsers: adminProcedure
    .input(z.object({ pageToken: z.string().optional(), pageSize: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.participant.listUsers(input.pageToken, input.pageSize);
    }),

  getUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.participant.getUser(input.userId);
    }),

  grantRights: adminProcedure
    .input(z.object({ userId: z.string(), partyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.participant.grantRights(input.userId, input.partyId);
      return { ok: true };
    }),

  revokeRights: adminProcedure
    .input(z.object({ userId: z.string(), partyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.participant.revokeRights(input.userId, input.partyId);
      return { ok: true };
    }),

  lookupContract: adminProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.pqs.lookupContract(input.contractId);
    }),

  getTemplateSummary: adminProcedure.query(async ({ ctx }) => {
    return ctx.pqs.getTemplateSummary(TEMPLATE_IDS);
  }),

  getActiveContracts: adminProcedure
    .input(z.object({
      parties: z.array(z.string()).optional(),
      templateIds: z.array(z.string()).optional(),
      limit: z.number().int().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const parties = input.parties?.length ? input.parties : [ctx.partyId];
      return ctx.ledger.getActiveContracts(parties, input.templateIds, input.limit);
    }),

  listPackages: adminProcedure.query(async ({ ctx }) => {
    return ctx.ledger.listPackages();
  }),

  listKnownTemplates: adminProcedure.query(async ({ ctx }) => {
    return ctx.pqs.listKnownTemplates();
  }),

  getAllActiveContracts: adminProcedure.query(async ({ ctx }) => {
    const results = await Promise.all(
      Object.entries(TEMPLATE_IDS).map(async ([templateName, templateId]) => {
        const contracts = await ctx.pqs.queryAllActive(templateId);
        return contracts.map((c) => ({ ...c, templateName }));
      })
    );
    return results.flat();
  }),
});
