import { request } from '../client'
import { normalizeMeasurement, normalizeSensor, unwrapList } from '../normalizers'
import type { Measurement, Sensor } from '../../types/domain'

export async function getLatestSensors(): Promise<Sensor[]> {
  const payload = await request<unknown>('/sensors/latest', {}, 'sensors')
  return unwrapList(payload, 'sensors').map(normalizeSensor)
}
export async function getSensorHistory(window = '1h'): Promise<Measurement[]> {
  const payload = await request<unknown>(`/sensors/history?window=${encodeURIComponent(window)}`, {}, 'sensors')
  return unwrapList(payload, 'measurements').map(normalizeMeasurement)
}
