import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff, registerUser } from '../registration/index.js';
import type { ParticipantClient } from '../participant/index.js';
import type { KeycloakClient } from '../keycloak/index.js';

// ── retryWithBackoff ──────────────────────────────────────────────────────────

describe('retryWithBackoff', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    expect(await retryWithBackoff(fn, 3, 0)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds eventually', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('ok');
    expect(await retryWithBackoff(fn, 3, 0)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(retryWithBackoff(fn, 3, 0)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ── registerUser ──────────────────────────────────────────────────────────────

function makeParticipant(overrides: Partial<ParticipantClient> = {}): ParticipantClient {
  return {
    allocateParty: vi.fn().mockResolvedValue('alice::abc123'),
    createUser: vi.fn().mockResolvedValue(undefined),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    getPartyForUser: vi.fn().mockResolvedValue(null),
    listParties: vi.fn().mockResolvedValue({ parties: [] }),
    getParticipantId: vi.fn().mockResolvedValue('participant-id'),
    listUsers: vi.fn().mockResolvedValue({ users: [] }),
    getUser: vi.fn().mockResolvedValue({ userId: 'user-id' }),
    grantRights: vi.fn().mockResolvedValue(undefined),
    revokeRights: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeKeycloak(overrides: Partial<KeycloakClient> = {}): KeycloakClient {
  return {
    createUser: vi.fn().mockResolvedValue('kc-uuid-123'),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const OPTS = { retryDelay: 0 };

describe('registerUser', () => {
  it('happy path returns partyId', async () => {
    const participant = makeParticipant();
    const keycloak = makeKeycloak();
    const result = await registerUser('alice', 'password', participant, keycloak, OPTS);
    expect(result).toEqual({ partyId: 'alice::abc123' });
    expect(participant.allocateParty).toHaveBeenCalledWith('alice');
    expect(keycloak.createUser).toHaveBeenCalledWith('alice', 'password');
    expect(participant.createUser).toHaveBeenCalledWith('kc-uuid-123', 'alice::abc123');
  });

  it('retries step 2 (Keycloak) on transient failure', async () => {
    const keycloak = makeKeycloak({
      createUser: vi
        .fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValue('kc-uuid-123'),
    });
    const participant = makeParticipant();
    const result = await registerUser('alice', 'pw', participant, keycloak, OPTS);
    expect(result.partyId).toBe('alice::abc123');
    expect(keycloak.createUser).toHaveBeenCalledTimes(2);
  });

  it('throws and does not clean up when step 2 (Keycloak) exhausts retries', async () => {
    const keycloak = makeKeycloak({
      createUser: vi.fn().mockRejectedValue(new Error('step2 fail')),
    });
    const participant = makeParticipant();
    await expect(
      registerUser('alice', 'pw', participant, keycloak, OPTS)
    ).rejects.toThrow('Keycloak user');
    expect(participant.createUser).not.toHaveBeenCalled();
    expect(keycloak.deleteUser).not.toHaveBeenCalled();
  });

  it('retries step 3 (Canton) on transient failure', async () => {
    const participant = makeParticipant({
      createUser: vi
        .fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValue(undefined),
    });
    const keycloak = makeKeycloak();
    const result = await registerUser('alice', 'pw', participant, keycloak, OPTS);
    expect(result.partyId).toBe('alice::abc123');
    expect(participant.createUser).toHaveBeenCalledTimes(2);
  });

  it('cleans up Keycloak user when step 3 (Canton) exhausts retries', async () => {
    const participant = makeParticipant({
      createUser: vi.fn().mockRejectedValue(new Error('step3 fail')),
    });
    const keycloak = makeKeycloak();
    await expect(
      registerUser('alice', 'pw', participant, keycloak, OPTS)
    ).rejects.toThrow('ledger user');
    expect(keycloak.deleteUser).toHaveBeenCalledWith('kc-uuid-123');
  });
});
