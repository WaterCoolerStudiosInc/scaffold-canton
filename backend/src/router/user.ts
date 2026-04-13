import { z } from 'zod';
import { router, partyProcedure } from '../trpc.js';
import { getHoldings, getLockedHoldings, getHoldingById } from '../domain/holdings.js';
import {
  getPendingTransfers,
  getPreapprovals,
  buildInitiateTransfer,
  buildAcceptTransfer,
  buildRejectTransfer,
  buildWithdrawTransfer,
} from '../domain/transfers.js';
import { getAllocations, buildCancelAllocation, buildWithdrawAllocation } from '../domain/allocations.js';
import {
  getDepositRequests,
  getDeposits,
  buildDepositRequest,
  buildAcceptDeposit,
  buildCancelDeposit,
  buildWithdrawDeposit,
  buildReleaseDeposit,
} from '../domain/vault.js';
import { instrumentIdSchema } from '../domain/types.js';
import { randomUUID } from 'crypto';

async function callValidatorOnboard(validatorUrl: string, getToken: () => Promise<string>, userId: string, partyId: string): Promise<{ status: number; body: string }> {
  const token = await getToken();
  const res = await fetch(`${validatorUrl}/api/validator/v0/admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: userId, party_id: partyId }),
  });
  return { status: res.status, body: await res.text() };
}

export const userRouter = router({
  getPartyForUser: partyProcedure.query(async ({ ctx }) => {
    if (!ctx.sub) return { partyId: ctx.partyId };
    const partyId = await ctx.participant.getPartyForUser(ctx.sub, ctx.token).catch(() => null);
    return { partyId: partyId ?? ctx.partyId };
  }),

  getCcBalance: partyProcedure.query(async ({ ctx }) => {
    if (!ctx.validatorUrl) throw new Error('VALIDATOR_URL not configured');
    const res = await fetch(`${ctx.validatorUrl}/api/validator/v0/wallet/balance`, {
      headers: { Authorization: `Bearer ${ctx.token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`CC balance failed ${res.status}: ${body}`);
    }
    return res.json();
  }),

  sendCc: partyProcedure
    .input(z.object({
      receiverPartyId: z.string(),
      amount: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.validatorUrl) throw new Error('VALIDATOR_URL not configured');
      try {
        const res = await fetch(`${ctx.validatorUrl}/api/validator/v0/wallet/transfer-offers`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ctx.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receiver_party_id: input.receiverPartyId,
            amount: input.amount,
            description: input.description ?? '',
            expires_at: Math.floor(Date.now() / 1000) + 86400,
          tracking_id: randomUUID(),
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`CC send failed ${res.status}: ${body}`);
        }
        return res.json();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const cause = e instanceof Error && e.cause ? ` (cause: ${e.cause})` : '';
        throw new Error(`CC send: ${msg}${cause}`);
      }
    }),

  listCcTransferOffers: partyProcedure.query(async ({ ctx }) => {
    if (!ctx.validatorUrl) throw new Error('VALIDATOR_URL not configured');
    const res = await fetch(`${ctx.validatorUrl}/api/validator/v0/wallet/transfer-offers`, {
      headers: { Authorization: `Bearer ${ctx.token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`List CC offers failed ${res.status}: ${body}`);
    }
    return res.json();
  }),

  acceptCcTransferOffer: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.validatorUrl) throw new Error('VALIDATOR_URL not configured');
      const res = await fetch(`${ctx.validatorUrl}/api/validator/v0/wallet/transfer-offers/${input.contractId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Accept CC offer failed ${res.status}: ${body}`);
      }
      return res.json();
    }),

  // ── External party signing (prepare → sign → submit-signed) ────────────


  // ── Vault ──────────────────────────────────────────────────────────────

  getDepositRequests: partyProcedure.query(async ({ ctx }) => {
    return getDepositRequests(ctx.pqs, ctx.partyId);
  }),

  getDeposits: partyProcedure.query(async ({ ctx }) => {
    return getDeposits(ctx.pqs, ctx.partyId);
  }),

  createDepositRequest: partyProcedure
    .input(z.object({ amount: z.string(), memo: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const command = buildDepositRequest(ctx.partyId, ctx.adminParty, input.amount, input.memo ?? '');
      return ctx.ledger.submit([ctx.partyId], [command], randomUUID());
    }),

  acceptDeposit: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.ledger.submit([ctx.partyId], [buildAcceptDeposit(input.contractId)], randomUUID());
    }),

  cancelDepositRequest: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.ledger.submit([ctx.partyId], [buildCancelDeposit(input.contractId)], randomUUID());
    }),

  withdrawDeposit: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.ledger.submit([ctx.partyId], [buildWithdrawDeposit(input.contractId)], randomUUID());
    }),

  releaseDeposit: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.ledger.submit([ctx.partyId], [buildReleaseDeposit(input.contractId)], randomUUID());
    }),

  onboardWallet: partyProcedure.mutation(async ({ ctx }) => {
    if (!ctx.validatorUrl) throw new Error('VALIDATOR_URL not configured');
    if (!ctx.sub) throw new Error('No user ID in token');
    const { status, body } = await callValidatorOnboard(ctx.validatorUrl, ctx.getLedgerToken, ctx.sub, ctx.partyId);
    if (status >= 400 && status !== 409) {
      throw new Error(`Validator onboard failed ${status}: ${body}`);
    }
    return { ok: true };
  }),

  getHoldings: partyProcedure.query(async ({ ctx }) => {
    return getHoldings(ctx.pqs, ctx.partyId);
  }),

  getHoldingById: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      return getHoldingById(ctx.pqs, input.contractId);
    }),

  getLockedHoldings: partyProcedure.query(async ({ ctx }) => {
    return getLockedHoldings(ctx.pqs, ctx.partyId);
  }),

  getPendingTransfers: partyProcedure.query(async ({ ctx }) => {
    return getPendingTransfers(ctx.pqs, ctx.partyId);
  }),

  getPreapprovals: partyProcedure.query(async ({ ctx }) => {
    return getPreapprovals(ctx.pqs, ctx.partyId);
  }),

  initiateTransfer: partyProcedure
    .input(
      z.object({
        rulesContractId: z.string(),
        inputHoldingCids: z.array(z.string()),
        receiver: z.string(),
        instrumentId: instrumentIdSchema,
        amount: z.string(),
        executeBefore: z.string(),
        preapprovalCid: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transfer = {
        sender: ctx.partyId,
        receiver: input.receiver,
        instrumentId: input.instrumentId,
        amount: input.amount,
        executeBefore: input.executeBefore,
      };
      const command = buildInitiateTransfer(
        input.rulesContractId,
        input.inputHoldingCids,
        transfer,
        input.preapprovalCid
      );
      return ctx.ledger.submit([ctx.partyId], [command], randomUUID());
    }),

  acceptTransfer: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.ledger.submit(
        [ctx.partyId],
        [buildAcceptTransfer(input.contractId)],
        randomUUID()
      );
    }),

  rejectTransfer: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.ledger.submit(
        [ctx.partyId],
        [buildRejectTransfer(input.contractId)],
        randomUUID()
      );
    }),

  withdrawTransfer: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.ledger.submit(
        [ctx.partyId],
        [buildWithdrawTransfer(input.contractId)],
        randomUUID()
      );
    }),

  // ── prepare variants (return commands for external-party / wallet signing) ──

  prepareInitiateTransfer: partyProcedure
    .input(
      z.object({
        rulesContractId: z.string(),
        inputHoldingCids: z.array(z.string()),
        receiver: z.string(),
        instrumentId: instrumentIdSchema,
        amount: z.string(),
        executeBefore: z.string(),
        preapprovalCid: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return buildInitiateTransfer(
        input.rulesContractId,
        input.inputHoldingCids,
        { sender: ctx.partyId, receiver: input.receiver, instrumentId: input.instrumentId, amount: input.amount, executeBefore: input.executeBefore },
        input.preapprovalCid
      );
    }),

  prepareAcceptTransfer: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(({ input }) => buildAcceptTransfer(input.contractId)),

  prepareRejectTransfer: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(({ input }) => buildRejectTransfer(input.contractId)),

  prepareWithdrawTransfer: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(({ input }) => buildWithdrawTransfer(input.contractId)),

  prepareCancelAllocation: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(({ input }) => buildCancelAllocation(input.contractId)),

  prepareWithdrawAllocation: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(({ input }) => buildWithdrawAllocation(input.contractId)),

  getAllocations: partyProcedure.query(async ({ ctx }) => {
    return getAllocations(ctx.pqs, ctx.partyId);
  }),

  cancelAllocation: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.ledger.submit(
        [ctx.partyId],
        [buildCancelAllocation(input.contractId)],
        randomUUID()
      );
    }),

  withdrawAllocation: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.ledger.submit(
        [ctx.partyId],
        [buildWithdrawAllocation(input.contractId)],
        randomUUID()
      );
    }),
});
