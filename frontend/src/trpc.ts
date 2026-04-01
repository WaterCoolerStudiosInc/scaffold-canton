import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from 'backend/router/index.js'

let _token: string | null = null

export function setToken(token: string | null) {
  _token = token
}

export function getToken(): string | null {
  return _token
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:8080/trpc',
      headers() {
        return _token ? { Authorization: `Bearer ${_token}` } : {}
      },
    }),
  ],
})
