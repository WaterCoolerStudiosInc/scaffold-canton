import { z } from 'zod';

export const TEMPLATE_IDS = {
  SimpleHolding:                'SimpleToken.Holding:SimpleHolding',
  LockedSimpleHolding:          'SimpleToken.Holding:LockedSimpleHolding',
  SimpleTokenRules:             'SimpleToken.Rules:SimpleTokenRules',
  SimpleTransferInstruction:    'SimpleToken.TransferInstruction:SimpleTransferInstruction',
  SimpleAllocation:             'SimpleToken.Allocation:SimpleAllocation',
  TransferPreapproval:          'SimpleToken.Preapproval:TransferPreapproval',
  SimpleAllocationRequest:      'SimpleToken.AllocationRequest:SimpleAllocationRequest',
} as const;
export const instrumentIdSchema = z.object({ admin: z.string(), id: z.string() });

export type AnyValue =
  | { tag: 'Text'; value: string }
  | { tag: 'Int64'; value: string }
  | { tag: 'Decimal'; value: string }
  | { tag: 'Bool'; value: boolean }
  | { tag: 'Timestamp'; value: string }
  | { tag: 'Party'; value: string }
  | { tag: 'ContractId'; value: string }
  | { tag: 'List'; value: AnyValue[] }
  | { tag: 'Map'; value: Record<string, AnyValue> };

export type Metadata = {
  values: Record<string, AnyValue>;
};

export const EMPTY_META: Metadata = { values: {} };

export type InstrumentId = {
  admin: string;
  id: string;
};

export type Lock = {
  holders: string[];
  expiresAt: string | null;
  lockId: string;
};

export type Transfer = {
  sender: string;
  receiver: string;
  instrumentId: InstrumentId;
  amount: string;
  executeBefore: string;
};

export type TransferLeg = {
  sender: string;
  receiver: string;
  instrumentId: InstrumentId;
  amount: string;
};

export type SettlementInfo = {
  executor: string;
  settleBefore: string;
  settlementId: string;
};

export type AllocationSpecification = {
  transferLeg: TransferLeg;
  settlement: SettlementInfo;
};


export type SimpleHolding = {
  admin: string;
  owner: string;
  instrumentId: InstrumentId;
  amount: string;
  meta: Metadata;
};

export type LockedSimpleHolding = {
  admin: string;
  owner: string;
  instrumentId: InstrumentId;
  amount: string;
  lock: Lock;
  extraObservers: string[];
  meta: Metadata;
};

export type SimpleTokenRules = {
  admin: string;
  supportedInstruments: string[];
};

export type SimpleTransferInstruction = {
  admin: string;
  transfer: Transfer;
  lockedHoldingCid: string;
  originalInstructionCid: string | null;
};

export type SimpleAllocation = {
  admin: string;
  allocation: AllocationSpecification;
  lockedHoldingCid: string;
};

export type TransferPreapproval = {
  admin: string;
  receiver: string;
  instrumentId: InstrumentId;
  expiresAt: string | null;
  meta: Metadata;
};
