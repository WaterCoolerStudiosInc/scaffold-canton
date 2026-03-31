export function createKeycloakClient(
  baseUrl: string,
  realm: string,
  adminClientId: string,
  adminClientSecret: string
) {
  let cachedToken = ''
  let expiresAt = 0

  async function getAdminToken(): Promise<string> {
    if (cachedToken && Date.now() / 1000 < expiresAt - 60) return cachedToken
    const res = await fetch(
      `${baseUrl}/realms/${realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: adminClientId,
          client_secret: adminClientSecret,
        }),
      }
    )
    if (!res.ok) throw new Error(`Keycloak admin token failed: ${res.status}`)
    const data = (await res.json()) as { access_token: string; expires_in: number }
    cachedToken = data.access_token
    expiresAt = Date.now() / 1000 + (data.expires_in ?? 300)
    return cachedToken
  }

  async function createUser(
    username: string,
    password: string
  ): Promise<string> {
    const token = await getAdminToken()
    const res = await fetch(`${baseUrl}/admin/realms/${realm}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        enabled: true,
        credentials: [{ type: 'password', value: password, temporary: false }],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Keycloak createUser failed ${res.status}: ${body}`)
    }
    const location = res.headers.get('location') ?? ''
    return location.split('/').pop() ?? ''
  }

  async function deleteUser(keycloakUserId: string): Promise<void> {
    const token = await getAdminToken()
    const res = await fetch(
      `${baseUrl}/admin/realms/${realm}/users/${encodeURIComponent(keycloakUserId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!res.ok && res.status !== 404) {
      const body = await res.text()
      throw new Error(`Keycloak deleteUser failed ${res.status}: ${body}`)
    }
  }

  return { createUser, deleteUser }
}

export type KeycloakClient = ReturnType<typeof createKeycloakClient>
