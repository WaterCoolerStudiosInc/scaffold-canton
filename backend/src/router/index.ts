import { z } from 'zod';
import { randomUUID } from 'crypto';
import { router, publicProcedure, partyProcedure } from '../trpc.js';
import { adminRouter } from './admin.js';
import { userRouter } from './user.js';
import { registrationRouter } from './registration.js';
import { getDepositRequests, getDeposits } from '../domain/vault.js';

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' as const })),
  whoami: partyProcedure.query(({ ctx }) => {
    return { partyId: ctx.partyId, isAdmin: ctx.isAdmin };
  }),

  // Public vault reads — no JWT required. Wallet users call these directly.
  vault: router({
    depositRequests: publicProcedure
      .input(z.object({ partyId: z.string() }))
      .query(({ ctx, input }) => getDepositRequests(ctx.pqs, input.partyId)),
    deposits: publicProcedure
      .input(z.object({ partyId: z.string() }))
      .query(({ ctx, input }) => getDeposits(ctx.pqs, input.partyId)),
  }),

  // External party signing — public endpoints (identity proven by signature, not JWT).
  // Backend uses admin token for Ledger API; the wallet extension provides the signature.
  // Interactive submission for external parties:
  //   POST /v2/interactive-submission/prepare → { preparedTransaction, preparedTransactionHash, hashingSchemeVersion }
  //   POST /v2/interactive-submission/execute → submit with party signatures
  prepareCommand: publicProcedure
    .input(z.object({ partyId: z.string(), commands: z.array(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.getLedgerToken();
      const ledgerUrl = process.env.LEDGER_URL ?? '';
      const res = await fetch(`${ledgerUrl}/v2/interactive-submission/prepare`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: input.commands,
          actAs: [input.partyId],
          commandId: randomUUID(),
          synchronizerId: process.env.SYNCHRONIZER_ID ?? '',
          packageIdSelectionPreference: [],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Prepare failed ${res.status}: ${body}`);
      }
      return res.json();
    }),

  submitSigned: publicProcedure
    .input(z.object({
      preparedTransaction: z.string(),
      hashingSchemeVersion: z.string(),
      partyId: z.string(),
      signature: z.string(),
      signedBy: z.string(),
      signingAlgorithmSpec: z.string(),
      format: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.getLedgerToken();
      const ledgerUrl = process.env.LEDGER_URL ?? '';
      const res = await fetch(`${ledgerUrl}/v2/interactive-submission/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preparedTransaction: input.preparedTransaction,
          hashingSchemeVersion: input.hashingSchemeVersion,
          submissionId: randomUUID(),
          partySignatures: {
            signatures: [{
              party: input.partyId,
              signatures: [{
                format: input.format,
                signature: input.signature,
                signedBy: input.signedBy,
                signingAlgorithmSpec: input.signingAlgorithmSpec,
              }],
            }],
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Execute failed ${res.status}: ${body}`);
      }
      return res.json();
    }),

  admin: adminRouter,
  user: userRouter,
  registration: registrationRouter,
});

export type AppRouter = typeof appRouter;
