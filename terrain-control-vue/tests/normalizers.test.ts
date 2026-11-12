import { describe, expect, it } from 'vitest'
import { normalizeAlert, normalizeJob, normalizeSensor, unwrapList } from '../src/api/normalizers'

describe('Adaptateurs REST polyglottes', () => {
  it('normalise des champs camelCase et snake_case', () => {
    const item = normalizeSensor({ sensor_id: 'esp32-A', temp: '24.5', hum: '49', press: 1010, timestamp: '2026-11-10T12:00:00Z' })
    expect(item.id).toBe('esp32-A')
    expect(item.temperature).toBe(24.5)
    expect(item.humidity).toBe(49)
  })
  it('accepte les enveloppes JSON courantes', () => {
    expect(unwrapList({ data: [{ id: 1 }] }, 'sensors')).toHaveLength(1)
    expect(unwrapList({ sensors: [{ id: 2 }] }, 'sensors')).toHaveLength(1)
  })
  it('limite les valeurs de progression des jobs', () => {
    expect(normalizeJob({ id: '1', state: 'active', progress: 180 }).progress).toBe(100)
  })
  it('normalise les niveaux et états d’alerte', () => {
    const alert = normalizeAlert({ id: 1, level: 'critical', status: 'acknowledged', message: 'Seuil atteint' })
    expect(alert.severity).toBe('critical')
    expect(alert.status).toBe('acknowledged')
  })
})
