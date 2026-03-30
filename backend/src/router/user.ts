// src/router/user.ts
import { z } from 'zod';
import { router, partyProcedure } from '../trpc.js';
import { getHoldings, getLockedHoldings } from '../domain/holdings.js';
import {
  getPendingTransfers,
  buildInitiateTransfer,
  buildAcceptTransfer,
  buildRejectTransfer,
  buildWithdrawTransfer,
} from '../domain/transfers.js';
import { getAllocations, buildCancelAllocation, buildWithdrawAllocation } from '../domain/allocations.js';
import { randomUUID } from 'crypto';

const instrumentIdSchema = z.object({ admin: z.string(), id: z.string() });

export const userRouter = router({
  getHoldings: partyProcedure.query(async ({ ctx }) => {
    return getHoldings(ctx.pqs, ctx.partyId);
  }),

  getLockedHoldings: partyProcedure.query(async ({ ctx }) => {
    return getLockedHoldings(ctx.pqs, ctx.partyId);
  }),

  getPendingTransfers: partyProcedure.query(async ({ ctx }) => {
    return getPendingTransfers(ctx.pqs, ctx.partyId);
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
