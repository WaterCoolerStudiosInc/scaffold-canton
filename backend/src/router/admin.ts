import { z } from 'zod';
import { router, adminProcedure } from '../trpc.js';
import { TEMPLATE_IDS } from '../domain/types.js';

export const adminRouter = router({
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
