import { buildCreate, buildExercise, type LedgerCommand } from '../ledger/index.js';
import type { PqsClient, PqsContract } from '../pqs/index.js';
import { TEMPLATE_IDS, type SimpleTokenRules } from './types.js';

const TEMPLATE = TEMPLATE_IDS.SimpleTokenRules;

export function buildCreateRules(
  admin: string,
  supportedInstruments: string[]
): LedgerCommand {
  return buildCreate(TEMPLATE, { admin, supportedInstruments });
}

export function buildUpdateInstruments(
  contractId: string,
  admin: string,
  supportedInstruments: string[]
): LedgerCommand[] {
  return [
    buildExercise(TEMPLATE, contractId, 'Archive', {}),
    buildCreate(TEMPLATE, { admin, supportedInstruments }),
  ];
}

export async function getRules(
  pqs: PqsClient,
  admin: string
): Promise<PqsContract<SimpleTokenRules> | null> {
  const results = await pqs.queryActiveByField<SimpleTokenRules>(
    TEMPLATE,
    'admin',
    admin
  );
  return results[0] ?? null;
}
