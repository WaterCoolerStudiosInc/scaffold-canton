import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from 'backend/router/index.js'

let _token: string | null = null
let _partyHint: string | null = null

export function setToken(token: string | null) {
  _token = token
}

export function getToken(): string | null {
  return _token
}

export function setPartyHint(partyId: string | null) {
  _partyHint = partyId
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:8080/trpc',
      headers() {
        const h: Record<string, string> = {}
        if (_token) h['Authorization'] = `Bearer ${_token}`
        if (_partyHint) h['X-Party-Id'] = _partyHint
        return h
      },
    }),
  ],
})
