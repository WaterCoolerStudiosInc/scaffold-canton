import { buildCreate, buildExercise, type LedgerCommand } from '../ledger/index.js';
import type { PqsClient, PqsContract } from '../pqs/index.js';
import { TEMPLATE_IDS, type DepositRequest, type DepositRecord } from './types.js';

// Ledger API commands need full hash
const REQUEST = TEMPLATE_IDS.DepositRequest;
const DEPOSIT = TEMPLATE_IDS.Deposit;

// PQS active() needs Module:Template (no hash)
const PQS_REQUEST = 'Vault:DepositRequest';
const PQS_DEPOSIT = 'Vault:Deposit';

export function buildDepositRequest(
  user: string,
  admin: string,
  amount: string,
  memo: string,
): LedgerCommand {
  return buildCreate(REQUEST, { user, admin, amount, memo });
}

export function buildAcceptDeposit(contractId: string): LedgerCommand {
  return buildExercise(REQUEST, contractId, 'DepositRequest_Accept', {});
}

export function buildCancelDeposit(contractId: string): LedgerCommand {
  return buildExercise(REQUEST, contractId, 'DepositRequest_Cancel', {});
}

export function buildWithdrawDeposit(contractId: string): LedgerCommand {
  return buildExercise(DEPOSIT, contractId, 'Deposit_Withdraw', {});
}

export function buildReleaseDeposit(contractId: string): LedgerCommand {
  return buildExercise(DEPOSIT, contractId, 'Deposit_Release', {});
}

export async function getDepositRequests(
  pqs: PqsClient,
  partyId: string,
): Promise<PqsContract<DepositRequest>[]> {
  const rows = await pqs.sql<
    { contract_id: string; payload: DepositRequest; created_effective_at: string }[]
  >`
    SELECT contract_id, payload, created_effective_at
    FROM active(${PQS_REQUEST})
    WHERE payload->>'user' = ${partyId}
       OR payload->>'admin' = ${partyId}
  `;
  return rows.map((r) => ({
    contractId: r.contract_id,
    payload: r.payload,
    createdAt: r.created_effective_at,
  }));
}

export async function getDeposits(
  pqs: PqsClient,
  partyId: string,
): Promise<PqsContract<DepositRecord>[]> {
  const rows = await pqs.sql<
    { contract_id: string; payload: DepositRecord; created_effective_at: string }[]
  >`
    SELECT contract_id, payload, created_effective_at
    FROM active(${PQS_DEPOSIT})
    WHERE payload->>'user' = ${partyId}
       OR payload->>'admin' = ${partyId}
  `;
  return rows.map((r) => ({
    contractId: r.contract_id,
    payload: r.payload,
    createdAt: r.created_effective_at,
  }));
}
