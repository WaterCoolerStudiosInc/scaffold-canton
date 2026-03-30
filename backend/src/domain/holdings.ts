// src/domain/holdings.ts
import { buildCreate, type LedgerCommand } from '../ledger/index.js';
import type { PqsClient, PqsContract } from '../pqs/index.js';
import {
  TEMPLATE_IDS,
  type InstrumentId,
  type Metadata,
  type SimpleHolding,
  type LockedSimpleHolding,
} from './types.js';

const HOLDING = TEMPLATE_IDS.SimpleHolding;
const LOCKED = TEMPLATE_IDS.LockedSimpleHolding;

const EMPTY_META: Metadata = { values: {} };

export function buildMintHolding(
  admin: string,
  owner: string,
  instrumentId: InstrumentId,
  amount: string,
  meta: Metadata = EMPTY_META
): LedgerCommand {
  return buildCreate(HOLDING, { admin, owner, instrumentId, amount, meta });
}

export async function getHoldings(
  pqs: PqsClient,
  owner: string
): Promise<PqsContract<SimpleHolding>[]> {
  return pqs.queryActiveByField<SimpleHolding>(HOLDING, 'owner', owner);
}

export async function getLockedHoldings(
  pqs: PqsClient,
  owner: string
): Promise<PqsContract<LockedSimpleHolding>[]> {
  return pqs.queryActiveByField<LockedSimpleHolding>(LOCKED, 'owner', owner);
}

export async function getHoldingById(
  pqs: PqsClient,
  contractId: string
): Promise<PqsContract<SimpleHolding> | null> {
  return pqs.queryActiveById<SimpleHolding>(HOLDING, contractId);
}
