import { request } from '../client'
import { normalizeAlert, unwrapList } from '../normalizers'
import type { Alert } from '../../types/domain'

export async function getAlerts(): Promise<Alert[]> {
  const payload = await request<unknown>('/alerts', {}, 'alerts')
  return unwrapList(payload, 'alerts').map(normalizeAlert)
}
export async function acknowledgeAlert(id: string): Promise<void> {
  // Adapter si ton backend expose PUT, POST ou une route différente.
  await request<unknown>(`/alerts/${encodeURIComponent(id)}/ack`, { method: 'PATCH' }, 'alerts')
}
