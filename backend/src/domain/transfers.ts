import { buildExercise, buildCreate, type LedgerCommand } from '../ledger/index.js';
import type { PqsClient, PqsContract } from '../pqs/index.js';
import {
  TEMPLATE_IDS,
  EMPTY_META,
  type Transfer,
  type InstrumentId,
  type Metadata,
  type SimpleTransferInstruction,
  type TransferPreapproval,
  type AnyValue,
} from './types.js';

const RULES = TEMPLATE_IDS.SimpleTokenRules;
const INSTRUCTION = TEMPLATE_IDS.SimpleTransferInstruction;
const PREAPPROVAL = TEMPLATE_IDS.TransferPreapproval;

export function buildInitiateTransfer(
  rulesContractId: string,
  inputCids: string[],
  transfer: Transfer,
  preapprovalCid?: string
): LedgerCommand {
  const context: Record<string, AnyValue> = {};
  if (preapprovalCid) {
    context['transfer-preapproval'] = { tag: 'ContractId', value: preapprovalCid };
  }
  return buildExercise(RULES, rulesContractId, 'TransferFactory_Transfer', {
    inputs: inputCids,
    transfer,
    context: { values: context },
  });
}

export function buildAcceptTransfer(contractId: string): LedgerCommand {
  return buildExercise(INSTRUCTION, contractId, 'TransferInstruction_Accept', {});
}

export function buildRejectTransfer(contractId: string): LedgerCommand {
  return buildExercise(INSTRUCTION, contractId, 'TransferInstruction_Reject', {});
}

export function buildWithdrawTransfer(contractId: string): LedgerCommand {
  return buildExercise(INSTRUCTION, contractId, 'TransferInstruction_Withdraw', {});
}

export function buildCreatePreapproval(
  admin: string,
  receiver: string,
  instrumentId: InstrumentId,
  expiresAt: string | null = null,
  meta: Metadata = EMPTY_META
): LedgerCommand {
  return buildCreate(PREAPPROVAL, { admin, receiver, instrumentId, expiresAt, meta });
}

export async function getPendingTransfers(
  pqs: PqsClient,
  partyId: string
): Promise<PqsContract<SimpleTransferInstruction>[]> {
  const rows = await pqs.sql<
    { contract_id: string; payload: SimpleTransferInstruction; created_effective_at: string }[]
  >`
    SELECT contract_id, payload, created_effective_at
    FROM active(${INSTRUCTION})
    WHERE payload->'transfer'->>'sender' = ${partyId}
       OR payload->'transfer'->>'receiver' = ${partyId}
  `;
  return rows.map((r) => ({
    contractId: r.contract_id,
    payload: r.payload,
    createdAt: r.created_effective_at,
  }));
}

export async function getPreapprovals(
  pqs: PqsClient,
  receiver: string
): Promise<PqsContract<TransferPreapproval>[]> {
  return pqs.queryActiveByField<TransferPreapproval>(PREAPPROVAL, 'receiver', receiver);
}
