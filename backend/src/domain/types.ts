// Re-export from generated file — full package hashes required by Canton 3.4.12+
export { TEMPLATE_IDS } from '../generated/template-ids.js';

export type DepositRequest = {
  user: string;
  admin: string;
  amount: string;
  memo: string;
};

export type DepositRecord = {
  user: string;
  admin: string;
  amount: string;
  memo: string;
};
