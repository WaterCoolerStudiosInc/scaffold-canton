// src/auth/index.ts
import { TRPCError } from '@trpc/server';
import * as jose from 'jose';

export type AuthConfig = {
  adminParty: string;
  jwksUri: string;
  jwksUriUser?: string;
  audience: string;
};

export type AuthContext = {
  partyId: string;
  isAdmin: boolean;
  token: string;
  sub?: string;
};

const jwksCache = new Map<string, ReturnType<typeof jose.createRemoteJWKSet>>();

export async function resolveContext(
  authHeader: string | undefined,
  config: AuthConfig
): Promise<AuthContext> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing Bearer token' });
  }

  const token = authHeader.slice(7);
  const jwksUris = [
    config.jwksUri,
    ...(config.jwksUriUser ? [config.jwksUriUser] : []),
  ];

  for (const uri of jwksUris) {
    let jwks = jwksCache.get(uri);
    if (!jwks) {
      jwks = jose.createRemoteJWKSet(new URL(uri));
      jwksCache.set(uri, jwks);
    }
    try {
      const { payload } = await jose.jwtVerify(token, jwks, {
        audience: config.audience,
      });
      const partyId =
        (payload['party_id'] as string | undefined) ?? config.adminParty;
      const sub = payload.sub;
      return { partyId, isAdmin: partyId === config.adminParty, token, sub };
    } catch {
      // try next JWKS URI
    }
  }

  throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid JWT' });
}
