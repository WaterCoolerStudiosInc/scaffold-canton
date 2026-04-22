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

  listVettedPackages: adminProcedure
    .input(
      z
        .object({
          packageIds: z.array(z.string()).optional(),
          packageNamePrefixes: z.array(z.string()).optional(),
          participantIds: z.array(z.string()).optional(),
          synchronizerIds: z.array(z.string()).optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.topology.listVettedPackages(input);
    }),

  vetPackage: adminProcedure
    .input(
      z.object({
        packageId: z.string().length(64),
        packageName: z.string().min(1),
        packageVersion: z.string().min(1),
        synchronizerId: z.string().optional(),
        dryRun: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.topology.updateVettedPackages({
        vet: [{ package_id: input.packageId, package_name: input.packageName, package_version: input.packageVersion }],
        dryRun: input.dryRun,
        synchronizerId: input.synchronizerId,
      });
    }),

  unvetPackage: adminProcedure
    .input(
      z.object({
        packageId: z.string().length(64),
        packageName: z.string().min(1),
        packageVersion: z.string().min(1),
        synchronizerId: z.string().optional(),
        dryRun: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.topology.updateVettedPackages({
        unvet: [{ package_id: input.packageId, package_name: input.packageName, package_version: input.packageVersion }],
        dryRun: input.dryRun,
        synchronizerId: input.synchronizerId,
      });
    }),

  swapVettedPackage: adminProcedure
    .input(
      z.object({
        unvet: z.object({ packageId: z.string().length(64), packageName: z.string().min(1), packageVersion: z.string().min(1) }),
        vet: z.object({ packageId: z.string().length(64), packageName: z.string().min(1), packageVersion: z.string().min(1) }),
        synchronizerId: z.string().optional(),
        dryRun: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.topology.updateVettedPackages({
        unvet: [
          { package_id: input.unvet.packageId, package_name: input.unvet.packageName, package_version: input.unvet.packageVersion },
        ],
        vet: [
          { package_id: input.vet.packageId, package_name: input.vet.packageName, package_version: input.vet.packageVersion },
        ],
        dryRun: input.dryRun,
        synchronizerId: input.synchronizerId,
      });
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
