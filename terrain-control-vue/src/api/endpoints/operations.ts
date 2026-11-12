import { request } from '../client'

// Connecteurs optionnels correspondant aux schémas « HTTP vs RabbitMQ » / « Workers ».
// À adapter selon l’API exacte de tes services orders, users et monitoring.
export async function getOrders(): Promise<unknown> {
  return request<unknown>('/orders', {}, 'orders')
}
export async function getUsers(): Promise<unknown> {
  return request<unknown>('/users', {}, 'users')
}
export async function getQueueStatus(): Promise<unknown> {
  return request<unknown>('/monitoring/queues', {}, 'monitoring')
}
