import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: vi.fn(),
}));

import * as jose from 'jose';
import { resolveContext, type AuthConfig } from '../auth/index.js';

const config: AuthConfig = {
  adminParty: 'admin-party::abc123',
  jwksUri: 'https://auth.example.com/realms/canton/protocol/openid-connect/certs',
  audience: 'https://canton.network.global',
};

beforeEach(() => vi.clearAllMocks());

describe('resolveContext', () => {
  it('throws UNAUTHORIZED when no auth header', async () => {
    await expect(resolveContext(undefined, config)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('throws UNAUTHORIZED when header is not Bearer', async () => {
    await expect(resolveContext('Basic abc', config)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('returns isAdmin true when party matches adminParty', async () => {
    vi.mocked(jose.jwtVerify).mockResolvedValueOnce({
      payload: { party_id: 'admin-party::abc123' },
    } as never);

    const ctx = await resolveContext('Bearer valid.jwt.token', config);
    expect(ctx).toEqual({ partyId: 'admin-party::abc123', isAdmin: true, token: 'valid.jwt.token', sub: undefined });
  });

  it('returns isAdmin false for non-admin party', async () => {
    vi.mocked(jose.jwtVerify).mockResolvedValueOnce({
      payload: { party_id: 'user-party::xyz789' },
    } as never);

    const ctx = await resolveContext('Bearer valid.jwt.token', config);
    expect(ctx).toEqual({ partyId: 'user-party::xyz789', isAdmin: false, token: 'valid.jwt.token', sub: undefined });
  });

  it('throws UNAUTHORIZED when JWT validation fails', async () => {
    vi.mocked(jose.jwtVerify).mockRejectedValueOnce(new Error('bad sig'));

    await expect(
      resolveContext('Bearer invalid.jwt', config)
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
