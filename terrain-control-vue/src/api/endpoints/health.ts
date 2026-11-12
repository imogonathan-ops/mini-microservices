import { request } from "../client";
import { targetForService } from "../config";
import type { ServiceDefinition, ServiceHealth } from "../../types/domain";

export async function checkHealth(
  service: ServiceDefinition,
): Promise<ServiceHealth> {
  if (!service.healthPath) return { status: "unknown" };
  const started = performance.now();
  try {
    await request<unknown>(
      service.healthPath,
      {},
      targetForService(service.label),
    );
    return {
      status: "online",
      latencyMs: Math.round(performance.now() - started),
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return { status: "offline", checkedAt: new Date().toISOString() };
  }
}
