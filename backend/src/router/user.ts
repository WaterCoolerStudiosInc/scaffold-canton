import { z } from 'zod';
import { router, partyProcedure } from '../trpc.js';
import {
  getDepositRequests,
  getDeposits,
  buildDepositRequest,
  buildAcceptDeposit,
  buildCancelDeposit,
  buildWithdrawDeposit,
  buildReleaseDeposit,
} from '../domain/vault.js';
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

  // ── CC (Canton Coin) ────────────────────────────────────────────────────

  getCcBalance: partyProcedure.query(async ({ ctx }) => {
    if (!ctx.validatorUrl) throw new Error('VALIDATOR_URL not configured');
    const res = await fetch(`${ctx.validatorUrl}/api/validator/v0/wallet/balance`, {
      headers: { Authorization: `Bearer ${ctx.token}` },
    });
    if (!res.ok) throw new Error(`CC balance failed ${res.status}: ${await res.text()}`);
    return res.json();
  }),

  sendCc: partyProcedure
    .input(z.object({ receiverPartyId: z.string(), amount: z.string(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.validatorUrl) throw new Error('VALIDATOR_URL not configured');
      const res = await fetch(`${ctx.validatorUrl}/api/validator/v0/wallet/transfer-offers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ctx.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_party_id: input.receiverPartyId,
          amount: input.amount,
          description: input.description ?? '',
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          tracking_id: randomUUID(),
        }),
      });
      if (!res.ok) throw new Error(`CC send failed ${res.status}: ${await res.text()}`);
      return res.json();
    }),

  listCcTransferOffers: partyProcedure.query(async ({ ctx }) => {
    if (!ctx.validatorUrl) throw new Error('VALIDATOR_URL not configured');
    const res = await fetch(`${ctx.validatorUrl}/api/validator/v0/wallet/transfer-offers`, {
      headers: { Authorization: `Bearer ${ctx.token}` },
    });
    if (!res.ok) throw new Error(`List CC offers failed ${res.status}: ${await res.text()}`);
    return res.json();
  }),

  acceptCcTransferOffer: partyProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.validatorUrl) throw new Error('VALIDATOR_URL not configured');
      const res = await fetch(`${ctx.validatorUrl}/api/validator/v0/wallet/transfer-offers/${input.contractId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ctx.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Accept CC offer failed ${res.status}: ${await res.text()}`);
      return res.json();
    }),

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

  // ── Validator wallet ───────────────────────────────────────────────────

  onboardWallet: partyProcedure.mutation(async ({ ctx }) => {
    if (!ctx.validatorUrl) throw new Error('VALIDATOR_URL not configured');
    if (!ctx.sub) throw new Error('No user ID in token');
    const { status, body } = await callValidatorOnboard(ctx.validatorUrl, ctx.getLedgerToken, ctx.sub, ctx.partyId);
    if (status >= 400 && status !== 409) throw new Error(`Validator onboard failed ${status}: ${body}`);
    return { ok: true };
  }),
});
