import { Hono } from 'hono';
import { resolveContext, type AuthConfig } from '../auth/index.js';
import type { LedgerClient } from '../ledger/index.js';
import type { ParticipantClient } from '../participant/index.js';

export function createUploadRouter(
  authConfig: AuthConfig,
  ledger: LedgerClient,
  participant: ParticipantClient,
  partyCache: Map<string, string>
): Hono {
  const app = new Hono();

  app.post('/admin/upload-package', async (c) => {
    const authHeader = c.req.header('authorization');
    if (!authHeader) return c.json({ error: 'Missing Authorization header' }, 401);

    let partyId: string;
    try {
      const auth = await resolveContext(authHeader, authConfig);
      partyId = auth.partyId;
      if (!partyId && auth.sub) {
        partyId = partyCache.get(auth.sub)
          ?? await participant.getPartyForUser(auth.sub).catch(() => null)
          ?? '';
        if (partyId) partyCache.set(auth.sub, partyId);
      }
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }

    if (partyId !== authConfig.adminParty) return c.json({ error: 'Admin only' }, 403);

    const contentType = c.req.header('content-type') ?? '';
    if (!contentType.includes('application/octet-stream')) {
      return c.json({ error: 'Content-Type must be application/octet-stream' }, 400);
    }

    const body = await c.req.arrayBuffer();
    const result = await ledger.uploadPackage(body);
    return c.json({ ok: true, packageId: result });
  });

  return app;
}
