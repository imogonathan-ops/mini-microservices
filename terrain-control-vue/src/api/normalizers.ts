import type {
  Alert,
  Job,
  Measurement,
  Sensor,
  SensorStatus,
  Severity,
} from "../types/domain";

type Obj = Record<string, unknown>;
const asObject = (value: unknown): Obj =>
  value && typeof value === "object" ? value as Obj : {};
const string = (value: unknown, fallback = "") =>
  value === undefined || value === null ? fallback : String(value);
const number = (value: unknown, fallback = 0) =>
  value === null || value === undefined || value === ""
    ? fallback
    : (Number.isFinite(Number(value)) ? Number(value) : fallback);
const iso = (value: unknown) => {
  const d = value ? new Date(String(value)) : new Date();
  return Number.isNaN(d.valueOf()) ? new Date().toISOString() : d.toISOString();
};
// Accepte une liste directe, ou {items}, {data}, {sensors}, {alerts}, {jobs}.
export function unwrapList(payload: unknown, key: string): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asObject(payload);
  const candidate = root[key] ?? root.items ?? root.data ?? root.results;
  if (Array.isArray(candidate)) return candidate;
  if (candidate && typeof candidate === "object") {
    const nested = asObject(candidate);
    return Array.isArray(nested[key])
      ? nested[key] as unknown[]
      : (Array.isArray(nested.items) ? nested.items as unknown[] : []);
  }
  return [];
}
export function normalizeSensor(raw: unknown): Sensor {
  const obj = asObject(raw);
  const temperature = number(obj.temperature ?? obj.temp ?? obj.value);
  const humidity = number(obj.humidity ?? obj.hum);
  const existing = string(obj.status ?? "").toLowerCase();
  const status: SensorStatus =
    existing === "critical" || existing === "warning" || existing === "normal"
      ? existing as SensorStatus
      : (temperature >= 31
        ? "critical"
        : temperature >= 28
        ? "warning"
        : "normal");
  return {
    id: string(obj.id ?? obj.sensorId ?? obj.sensor_id, "inconnu"),
    name: string(obj.name ?? obj.label, "Capteur"),
    zone: string(obj.zone ?? obj.room ?? obj.location, "Zone non renseignée"),
    model: string(obj.model, "ESP32 + BME280"),
    temperature,
    humidity,
    pressure: number(obj.pressure ?? obj.press, 1013),
    updatedAt: iso(obj.updatedAt ?? obj.timestamp ?? obj.time),
    status,
  };
}
export function normalizeMeasurement(raw: unknown): Measurement {
  const obj = asObject(raw);
  return {
    timestamp: iso(obj.timestamp ?? obj.time ?? obj.createdAt),
    temperature: number(obj.temperature ?? obj.temp),
    humidity: number(obj.humidity ?? obj.hum),
  };
}
export function normalizeAlert(raw: unknown): Alert {
  const obj = asObject(raw);
  const rawSeverity = string(obj.severity ?? obj.level, "warning")
    .toLowerCase();
  const severity: Severity =
    ["critical", "warning", "info"].includes(rawSeverity)
      ? rawSeverity as Severity
      : "warning";
  const rawStatus = string(obj.status, "active").toLowerCase();
  const status: Alert["status"] =
    ["active", "acknowledged", "resolved"].includes(rawStatus)
      ? rawStatus as Alert["status"]
      : "active";
  return {
    id: string(obj.id ?? obj.alertId, "n/a"),
    title: string(obj.title ?? obj.message, "Alerte"),
    detail: string(obj.detail ?? obj.description, ""),
    sensorId: string(obj.sensorId ?? obj.sensor_id, ""),
    severity,
    status,
    timestamp: iso(obj.timestamp ?? obj.createdAt),
  };
}
export function normalizeJob(raw: unknown): Job {
  const obj = asObject(raw);
  const s = string(obj.status ?? obj.state, "waiting").toLowerCase();
  const status: Job["status"] =
    ["waiting", "active", "completed", "failed"].includes(s)
      ? s as Job["status"]
      : "waiting";
  return {
    id: string(obj.id ?? obj.jobId, "n/a"),
    name: string(obj.name, "Job"),
    type: string(obj.type ?? obj.queue, "rapports"),
    status,
    progress: Math.max(0, Math.min(100, number(obj.progress))),
    attempts: number(obj.attempts ?? obj.attemptsMade),
    createdAt: iso(obj.createdAt ?? obj.timestamp),
  };
}
