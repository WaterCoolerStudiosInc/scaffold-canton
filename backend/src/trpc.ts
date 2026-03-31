import { initTRPC, TRPCError } from '@trpc/server';
import type { PqsClient } from './pqs/index.js';
import type { LedgerClient } from './ledger/index.js';
import type { ParticipantClient } from './participant/index.js';
import type { KeycloakClient } from './keycloak/index.js';

export type Context = {
  partyId: string;
  isAdmin: boolean;
  token: string;
  sub?: string;
  adminParty: string;
  pqs: PqsClient;
  ledger: LedgerClient;
  participant: ParticipantClient;
  keycloak: KeycloakClient;
  validatorUrl: string;
  getLedgerToken: () => Promise<string>;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const partyProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.partyId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
