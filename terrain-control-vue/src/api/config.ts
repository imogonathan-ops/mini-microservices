// Tout ce qui concerne les adresses des backends est centralisé ici.
// Par défaut, toutes les requêtes passent par le gateway /api.
// Si un backend tourne sur un port séparé, ajouter son URL dans .env.
// Exemple : VITE_SENSORS_API_URL=http://localhost:5100/api
export type ApiTarget = 'gateway' | 'sensors' | 'alerts' | 'reports' | 'auth' | 'orders' | 'users' | 'monitoring'
const gateway = import.meta.env.VITE_API_BASE_URL || '/api'
export const apiBases: Record<ApiTarget, string> = {
  gateway,
  sensors: import.meta.env.VITE_SENSORS_API_URL || gateway,
  alerts: import.meta.env.VITE_ALERTS_API_URL || gateway,
  reports: import.meta.env.VITE_REPORTS_API_URL || gateway,
  auth: import.meta.env.VITE_AUTH_API_URL || gateway,
  orders: import.meta.env.VITE_ORDERS_API_URL || gateway,
  users: import.meta.env.VITE_USERS_API_URL || gateway,
  monitoring: import.meta.env.VITE_MONITORING_API_URL || gateway
}
export function targetForService(service: string): ApiTarget {
  if (service === 'sensors-api') return 'sensors'
  if (service === 'alert-service') return 'alerts'
  if (service === 'report-service') return 'reports'
  if (service === 'auth-service') return 'auth'
  if (service === 'orders-service') return 'orders'
  if (service === 'users-service') return 'users'
  if (service === 'monitoring-api') return 'monitoring'
  return 'gateway'
}
