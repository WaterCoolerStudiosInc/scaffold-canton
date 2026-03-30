import type { ParticipantClient } from '../participant/index.js';
import type { KeycloakClient } from '../keycloak/index.js';


export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelay = 200
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < maxAttempts - 1 && initialDelay > 0) {
        await new Promise((r) => setTimeout(r, initialDelay * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

type RegisterOptions = {
  retryDelay?: number;
  maxAttempts?: number;
};

export async function registerUser(
  username: string,
  password: string,
  participant: ParticipantClient,
  keycloak: KeycloakClient,
  options: RegisterOptions = {}
): Promise<{ partyId: string }> {
  const { retryDelay = 200, maxAttempts = 3 } = options;

  // Step 1: allocate Canton party — on failure throw immediately, nothing to roll back
  const partyId = await retryWithBackoff(
    () => participant.allocateParty(username),
    maxAttempts,
    retryDelay
  );

  // Step 2: create Keycloak user — on failure throw, party is orphaned but harmless
  let keycloakId: string;
  try {
    keycloakId = await retryWithBackoff(
      () => keycloak.createUser(username, password),
      maxAttempts,
      retryDelay
    );
  } catch (cause) {
    throw new Error(`Failed to create Keycloak user for ${username}`, { cause });
  }

  // Step 3: create Canton ledger user with Keycloak UUID as ID — on failure compensate by deleting Keycloak user
  try {
    await retryWithBackoff(
      () => participant.createUser(keycloakId, partyId),
      maxAttempts,
      retryDelay
    );
  } catch (cause) {
    await keycloak.deleteUser(keycloakId).catch(() => {
      // best-effort cleanup
    });
    throw new Error(`Failed to create ledger user for ${username}`, { cause });
  }

  return { partyId };
}
