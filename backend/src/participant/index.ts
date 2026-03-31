export function createParticipantClient(
  baseUrl: string,
  getToken: () => string | Promise<string>
) {
  async function allocateParty(hint: string): Promise<string> {
    const token = await getToken()
    const res = await fetch(`${baseUrl}/v2/parties`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ partyIdHint: hint }),
    })
    if (!res.ok) {
      const body = await res.text()
      // In-flight: wait for the existing allocation to complete then retry
      if (res.status === 409) {
        await new Promise((r) => setTimeout(r, 1500))
        return allocateParty(hint)
      }
      // Already exists: parse the party ID out of the error and return it
      if (res.status === 400) {
        const match = body.match(/party ([\w-]+::[0-9a-f]+)/)
        if (match) return match[1]
      }
      throw new Error(`allocateParty failed ${res.status}: ${body}`)
    }
    const data = (await res.json()) as { partyDetails: { party: string } }
    return data.partyDetails.party
  }

  async function createUser(userId: string, partyId: string): Promise<void> {
    const token = await getToken()
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
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`createUser failed ${res.status}: ${body}`)
    }
  }

  async function deleteUser(userId: string): Promise<void> {
    const token = await getToken()
    const res = await fetch(
      `${baseUrl}/v2/users/${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!res.ok && res.status !== 404) {
      const body = await res.text()
      throw new Error(`deleteUser failed ${res.status}: ${body}`)
    }
  }

  async function getPartyForUser(userId: string, userToken?: string): Promise<string | null> {
    const token = userToken ?? (await getToken())
    const res = await fetch(
      `${baseUrl}/v2/users/${encodeURIComponent(userId)}/rights`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      rights: { kind: { CanActAs?: { value: { party: string } } } }[]
    }
    const right = data.rights.find((r) => r.kind?.CanActAs)
    return right?.kind?.CanActAs?.value.party ?? null
  }

  async function listParties(
    pageToken?: string,
    pageSize?: number
  ): Promise<{ parties: { partyId: string; isLocal: boolean }[]; nextPageToken?: string }> {
    const token = await getToken()
    const params = new URLSearchParams()
    if (pageToken) params.set('pageToken', pageToken)
    if (pageSize) params.set('pageSize', String(pageSize))
    const query = params.size ? `?${params}` : ''
    const res = await fetch(`${baseUrl}/v2/parties${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`listParties failed ${res.status}: ${body}`)
    }
    const data = (await res.json()) as {
      parties: { partyId: string; isLocal: boolean }[]
      nextPageToken?: string
    }
    return { parties: data.parties, nextPageToken: data.nextPageToken }
  }

  async function getParticipantId(): Promise<string> {
    const token = await getToken()
    const res = await fetch(`${baseUrl}/v2/parties/participant-id`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`getParticipantId failed ${res.status}: ${body}`)
    }
    const data = (await res.json()) as { participantId: string }
    return data.participantId
  }

  async function listUsers(
    pageToken?: string,
    pageSize?: number
  ): Promise<{ users: { userId: string; primaryParty?: string }[]; nextPageToken?: string }> {
    const token = await getToken()
    const params = new URLSearchParams()
    if (pageToken) params.set('pageToken', pageToken)
    if (pageSize) params.set('pageSize', String(pageSize))
    const query = params.size ? `?${params}` : ''
    const res = await fetch(`${baseUrl}/v2/users${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`listUsers failed ${res.status}: ${body}`)
    }
    const data = (await res.json()) as {
      users: { userId: string; primaryParty?: string }[]
      nextPageToken?: string
    }
    return { users: data.users, nextPageToken: data.nextPageToken }
  }

  async function getUser(userId: string): Promise<{ userId: string; primaryParty?: string }> {
    const token = await getToken()
    const res = await fetch(`${baseUrl}/v2/users/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`getUser failed ${res.status}: ${body}`)
    }
    const data = (await res.json()) as { user: { userId: string; primaryParty?: string } }
    return data.user
  }

  async function grantRights(userId: string, partyId: string): Promise<void> {
    const token = await getToken()
    const res = await fetch(`${baseUrl}/v2/users/${encodeURIComponent(userId)}/rights`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rights: [
          { kind: { CanActAs: { value: { party: partyId } } } },
          { kind: { CanReadAs: { value: { party: partyId } } } },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`grantRights failed ${res.status}: ${body}`)
    }
  }

  async function revokeRights(userId: string, partyId: string): Promise<void> {
    const token = await getToken()
    const res = await fetch(`${baseUrl}/v2/users/${encodeURIComponent(userId)}/rights`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rights: [
          { kind: { CanActAs: { value: { party: partyId } } } },
          { kind: { CanReadAs: { value: { party: partyId } } } },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`revokeRights failed ${res.status}: ${body}`)
    }
  }

  return { allocateParty, createUser, deleteUser, getPartyForUser, listParties, getParticipantId, listUsers, getUser, grantRights, revokeRights }
}

export type ParticipantClient = ReturnType<typeof createParticipantClient>
