import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createKeycloakClient } from '../keycloak/index.js';

describe('createKeycloakClient', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('createUser fetches admin token from configured realm then creates user', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ access_token: 'admin-tok', expires_in: 300 }),
        text: () => Promise.resolve(''),
        headers: { get: () => null },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        headers: {
          get: (k: string) =>
            k === 'location'
              ? 'https://auth.example.com/admin/realms/canton/users/user-uuid-123'
              : null,
        },
      });
    vi.stubGlobal('fetch', fetchMock);

    const client = createKeycloakClient('https://auth.example.com', 'canton', 'admin-cli', 'secret');
    const id = await client.createUser('alice', 'password123');

    expect(id).toBe('user-uuid-123');
    const [tokenUrl, tokenOpts] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe('https://auth.example.com/realms/canton/protocol/openid-connect/token');
    expect(tokenOpts.method).toBe('POST');
    const [userUrl, userOpts] = fetchMock.mock.calls[1];
    expect(userUrl).toBe('https://auth.example.com/admin/realms/canton/users');
    expect(userOpts.method).toBe('POST');
    const body = JSON.parse(userOpts.body);
    expect(body.username).toBe('alice');
    expect(body.credentials[0].value).toBe('password123');
  });

  it('createUser throws on non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'tok', expires_in: 300 }),
          text: () => Promise.resolve(''),
          headers: { get: () => null },
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve('User exists'),
          headers: { get: () => null },
        })
    );
    const client = createKeycloakClient('https://auth.example.com', 'canton', 'admin-cli', 'secret');
    await expect(client.createUser('alice', 'pw')).rejects.toThrow('409');
  });

  it('deleteUser calls DELETE on user endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'tok', expires_in: 300 }),
          text: () => Promise.resolve(''),
          headers: { get: () => null },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
          headers: { get: () => null },
        })
    );
    const client = createKeycloakClient('https://auth.example.com', 'canton', 'admin-cli', 'secret');
    await expect(client.deleteUser('user-uuid-123')).resolves.toBeUndefined();
  });

  it('deleteUser ignores 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'tok', expires_in: 300 }),
          text: () => Promise.resolve(''),
          headers: { get: () => null },
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve('not found'),
          headers: { get: () => null },
        })
    );
    const client = createKeycloakClient('https://auth.example.com', 'canton', 'admin-cli', 'secret');
    await expect(client.deleteUser('missing')).resolves.toBeUndefined();
  });
});
