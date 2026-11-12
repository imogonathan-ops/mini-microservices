export type SensorStatus = 'normal' | 'warning' | 'critical'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'
export type Severity = 'critical' | 'warning' | 'info'
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed'
export type ServiceStatus = 'online' | 'offline' | 'unknown'
export type Mode = 'demo' | 'live'

export interface Sensor {
  id: string
  name: string
  zone: string
  model: string
  temperature: number
  humidity: number
  pressure: number
  updatedAt: string
  status: SensorStatus
}
export interface Measurement {
  timestamp: string
  temperature: number
  humidity: number
}
export interface Alert {
  id: string
  title: string
  detail: string
  sensorId: string
  severity: Severity
  status: AlertStatus
  timestamp: string
}
export interface Job {
  id: string
  name: string
  type: string
  status: JobStatus
  progress: number
  attempts: number
  createdAt: string
}
export interface EventLog {
  id: string
  type: 'sensor' | 'alert' | 'job' | 'system'
  message: string
  timestamp: string
}
export interface ServiceDefinition {
  id: string
  label: string
  category: 'application' | 'infrastructure'
  stack: string
  description: string
  // Chemin GET via gateway. null = non testé, pas d'endpoint documenté.
  healthPath: string | null
}
export interface ServiceHealth {
  status: ServiceStatus
  latencyMs?: number
  checkedAt?: string
}
export interface EndpointDefinition {
  id: string
  service: string
  method: 'GET' | 'POST' | 'PATCH'
  path: string
  description: string
  readOnly: boolean
}
