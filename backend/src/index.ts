import './instrumentation.js'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './router/index.js'
import { createUploadRouter } from './router/upload.js'
import { resolveContext, type AuthConfig } from './auth/index.js'
import { createPqsClient } from './pqs/index.js'
import { createLedgerClient } from './ledger/index.js'
import { createParticipantClient } from './participant/index.js'
import { createKeycloakClient } from './keycloak/index.js'

const authConfig: AuthConfig = {
  adminParty: process.env.APP_PROVIDER_PARTY ?? '',
  jwksUri: process.env.JWKS_URI ?? '',
  jwksUriUser: process.env.JWKS_URI_USER || undefined,
  audience: process.env.JWKS_AUDIENCE ?? 'https://canton.network.global',
}

function createTokenGetter(
  tokenUrl: string,
  clientId: string,
  clientSecret: string
): () => Promise<string> {
  let cached = ''
  let expiresAt = 0
  return async () => {
    if (cached && Date.now() / 1000 < expiresAt - 60) return cached
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })
    if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`)
    const data = (await res.json()) as { access_token: string; expires_in: number }
    cached = data.access_token
    expiresAt = Date.now() / 1000 + (data.expires_in ?? 300)
    return cached
  }
}

const getLedgerToken = createTokenGetter(
  process.env.LEDGER_TOKEN_URL ?? '',
  process.env.LEDGER_CLIENT_ID ?? '',
  process.env.LEDGER_CLIENT_SECRET ?? ''
)

const pqs = createPqsClient(
  process.env.PQS_URL ?? 'postgresql://pqs:pqs@localhost:5432/pqs'
)

const ledger = createLedgerClient(
  process.env.LEDGER_URL ?? 'http://localhost:7575',
  getLedgerToken
)

const participant = createParticipantClient(
  process.env.LEDGER_URL ?? 'http://localhost:7575',
  getLedgerToken
)

const keycloak = createKeycloakClient(
  process.env.KEYCLOAK_BASE_URL ?? '',
  process.env.KEYCLOAK_REALM ?? 'canton',
  process.env.KEYCLOAK_ADMIN_CLIENT_ID ?? '',
  process.env.KEYCLOAK_ADMIN_CLIENT_SECRET ?? ''
)

// Cache sub → partyId so we only hit the ledger once per user per server lifetime
const partyCache = new Map<string, string>()

const app = new Hono()

app.use('*', cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}))

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: async ({ req }) => {
      const authHeader = req.headers.get('authorization') ?? undefined

      // Public procedures don't require auth — resolve gracefully, never throw here
      const auth = authHeader
        ? await resolveContext(authHeader, authConfig).catch(() => ({ partyId: '', isAdmin: false, token: authHeader.slice(7), sub: undefined }))
        : { partyId: '', isAdmin: false, token: '', sub: undefined }

      let partyId = auth.partyId
      if (!partyId && auth?.sub) {
        if (partyCache.has(auth.sub)) {
          partyId = partyCache.get(auth.sub)!
        } else {
          const found = await participant.getPartyForUser(auth.sub).catch(() => null)
          if (found) {
            partyCache.set(auth.sub, found)
            partyId = found
          }
        }
      }
      const isAdmin = partyId === authConfig.adminParty
      return { ...auth, partyId, isAdmin, adminParty: authConfig.adminParty, pqs, ledger, participant, keycloak, validatorUrl: process.env.VALIDATOR_URL ?? '', getLedgerToken }
    },
  })
)

app.route('/', createUploadRouter(authConfig, ledger, participant, partyCache))

serve({ fetch: app.fetch, port: 8080 }, () => {
  console.log('Backend listening on :8080')
})
