// src/domain/allocations.ts
import { buildExercise, type LedgerCommand } from '../ledger/index.js';
import type { PqsClient, PqsContract } from '../pqs/index.js';
import { TEMPLATE_IDS, type SimpleAllocation } from './types.js';

const ALLOCATION = TEMPLATE_IDS.SimpleAllocation;

export function buildCancelAllocation(contractId: string): LedgerCommand {
  return buildExercise(ALLOCATION, contractId, 'Allocation_Cancel', {});
}

export function buildWithdrawAllocation(contractId: string): LedgerCommand {
  return buildExercise(ALLOCATION, contractId, 'Allocation_Withdraw', {});
}

export async function getAllocations(
  pqs: PqsClient,
  partyId: string
): Promise<PqsContract<SimpleAllocation>[]> {
  const rows = await pqs.sql<
    { contract_id: string; payload: SimpleAllocation; created_effective_at: string }[]
  >`
    SELECT contract_id, payload, created_effective_at
    FROM active(${ALLOCATION})
    WHERE payload->'allocation'->'transferLeg'->>'sender' = ${partyId}
       OR payload->'allocation'->'transferLeg'->>'receiver' = ${partyId}
  `;
  return rows.map((r) => ({
    contractId: r.contract_id,
    payload: r.payload,
    createdAt: r.created_effective_at,
  }));
}
