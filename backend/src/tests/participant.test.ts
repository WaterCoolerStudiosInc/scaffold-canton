import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createParticipantClient } from '../participant/index.js';

const getToken = vi.fn().mockResolvedValue('admin-token');

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k] ?? null },
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  });
}

describe('createParticipantClient', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('allocateParty calls POST /v2/parties and returns party string', async () => {
    vi.stubGlobal('fetch', mockFetch(200, {
      partyDetails: { party: 'alice::abc123', isLocal: true },
    }));
    const client = createParticipantClient('http://ledger', getToken);
    const partyId = await client.allocateParty('alice');
    expect(partyId).toBe('alice::abc123');
    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://ledger/v2/parties');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ partyIdHint: 'alice' });
  });

  it('allocateParty throws on non-OK response', async () => {
    vi.stubGlobal('fetch', mockFetch(500, 'internal error'));
    const client = createParticipantClient('http://ledger', getToken);
    await expect(client.allocateParty('alice')).rejects.toThrow('500');
  });

  it('createUser calls POST /v2/users with correct rights', async () => {
    vi.stubGlobal('fetch', mockFetch(200, {}));
    const client = createParticipantClient('http://ledger', getToken);
    await client.createUser('alice', 'alice::abc123');
    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://ledger/v2/users');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.user.id).toBe('alice');
    expect(body.rights).toContainEqual({ kind: { CanActAs: { value: { party: 'alice::abc123' } } } });
    expect(body.rights).toContainEqual({ kind: { CanReadAs: { value: { party: 'alice::abc123' } } } });
  });

  it('deleteUser calls DELETE /v2/users/:id', async () => {
    vi.stubGlobal('fetch', mockFetch(200, {}));
    const client = createParticipantClient('http://ledger', getToken);
    await client.deleteUser('alice');
    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://ledger/v2/users/alice');
    expect(opts.method).toBe('DELETE');
  });

  it('deleteUser ignores 404', async () => {
    vi.stubGlobal('fetch', mockFetch(404, 'not found'));
    const client = createParticipantClient('http://ledger', getToken);
    await expect(client.deleteUser('alice')).resolves.toBeUndefined();
  });
});
