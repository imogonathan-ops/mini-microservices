import { apiBases, type ApiTarget } from './config'

export function apiUrl(path: string, target: ApiTarget = 'gateway') {
  const root = apiBases[target].replace(/\/$/, '')
  return `${root}${path.startsWith('/') ? path : `/${path}`}`
}

// Token en mémoire uniquement ; brancher à auth-service si besoin.
// Ne pas inclure de mot de passe, clé RabbitMQ ou secret Docker dans VITE_*.
let accessToken: string | null = null
export function setAccessToken(token: string | null) { accessToken = token }

export async function request<T>(path: string, options: RequestInit = {}, target: ApiTarget = 'gateway'): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 6500)
  try {
    const headers = new Headers(options.headers)
    headers.set('Accept', 'application/json')
    if (options.body) headers.set('Content-Type', 'application/json')
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
    const response = await fetch(apiUrl(path, target), { ...options, headers, signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status} · ${response.statusText}`)
    if (response.status === 204) return undefined as T
    const type = response.headers.get('content-type') ?? ''
    if (!type.includes('json')) return (await response.text()) as T
    return (await response.json()) as T
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Délai dépassé (6,5 s)')
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}
