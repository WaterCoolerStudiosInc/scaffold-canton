export function createParticipantClient(
  baseUrl: string,
  getToken: () => string | Promise<string>
) {
  async function allocateParty(hint: string): Promise<string> {
    const token = await getToken();
    const res = await fetch(`${baseUrl}/v2/parties`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ partyIdHint: hint }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`allocateParty failed ${res.status}: ${body}`);
    }
    const data = (await res.json()) as { partyDetails: { party: string } };
    return data.partyDetails.party;
  }

  async function createUser(userId: string, partyId: string): Promise<void> {
    const token = await getToken();
    const res = await fetch(`${baseUrl}/v2/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: { id: userId, primaryParty: partyId },
        rights: [
          { kind: { CanActAs: { value: { party: partyId } } } },
          { kind: { CanReadAs: { value: { party: partyId } } } },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`createUser failed ${res.status}: ${body}`);
    }
  }

  async function deleteUser(userId: string): Promise<void> {
    const token = await getToken();
    const res = await fetch(
      `${baseUrl}/v2/users/${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok && res.status !== 404) {
      const body = await res.text();
      throw new Error(`deleteUser failed ${res.status}: ${body}`);
    }
  }

  async function getPartyForUser(userId: string, userToken?: string): Promise<string | null> {
    const token = userToken ?? (await getToken());
    const res = await fetch(
      `${baseUrl}/v2/users/${encodeURIComponent(userId)}/rights`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      rights: { kind: { CanActAs?: { value: { party: string } } } }[];
    };
    const right = data.rights.find((r) => r.kind?.CanActAs);
    return right?.kind?.CanActAs?.value.party ?? null;
  }

  return { allocateParty, createUser, deleteUser, getPartyForUser };
}

export type ParticipantClient = ReturnType<typeof createParticipantClient>;
