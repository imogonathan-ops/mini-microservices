import { computed, onMounted, onUnmounted, ref } from "vue";
import { createDemoData } from "../data/demo";
import { services } from "../api/registry";
import { getLatestSensors, getSensorHistory } from "../api/endpoints/sensors";
import { acknowledgeAlert, getAlerts } from "../api/endpoints/alerts";
import { createReportJob, getJobs } from "../api/endpoints/jobs";
import { checkHealth } from "../api/endpoints/health";
import { connectMeasurements, type RealtimeConnection } from "../api/realtime";
import type {
  Alert,
  EventLog,
  Job,
  Measurement,
  Mode,
  Sensor,
  ServiceHealth,
} from "../types/domain";

type HealthMap = Record<string, ServiceHealth>;
const initialMode: Mode = import.meta.env.VITE_DATA_MODE === "live"
  ? "live"
  : "demo";
const pollMs = Math.max(3000, Number(import.meta.env.VITE_POLL_MS) || 10000);
const asError = (e: unknown) => e instanceof Error ? e.message : String(e);

export function useDashboard() {
  const mode = ref<Mode>(initialMode);
  const sensors = ref<Sensor[]>([]);
  const history = ref<Measurement[]>([]);
  const alerts = ref<Alert[]>([]);
  const jobs = ref<Job[]>([]);
  const events = ref<EventLog[]>([]);
  const health = ref<HealthMap>({});
  const socketStatus = ref<"connected" | "disconnected" | "demo">(
    "disconnected",
  );
  const lastSync = ref<string | null>(null);
  const loading = ref(false);
  const busy = ref(false);
  const error = ref<string | null>(null);
  const dataFailures = ref<string[]>([]);
  const activeAlerts = computed(() =>
    alerts.value.filter((a) => a.status === "active")
  );
  const onlineCount = computed(() =>
    services.filter((s) => health.value[s.id]?.status === "online").length
  );
  const avgTemp = computed(() =>
    sensors.value.length
      ? sensors.value.reduce((s, v) => s + v.temperature, 0) /
        sensors.value.length
      : null
  );
  const avgHumidity = computed(() =>
    sensors.value.length
      ? sensors.value.reduce((s, v) => s + v.humidity, 0) / sensors.value.length
      : null
  );
  let pollTimer: number | undefined;
  let demoTimer: number | undefined;
  let realtime: RealtimeConnection | undefined;
  let seq = 3000;
  let session = 0;

  function addEvent(type: EventLog["type"], message: string) {
    events.value = [{
      id: `EVT-${++seq}`,
      type,
      message,
      timestamp: new Date().toISOString(),
    }, ...events.value].slice(0, 20);
  }
  function stop() {
    if (pollTimer) window.clearInterval(pollTimer);
    if (demoTimer) window.clearInterval(demoTimer);
    pollTimer = undefined;
    demoTimer = undefined;
    realtime?.disconnect();
    realtime = undefined;
  }
  function startDemo() {
    const demo = createDemoData();
    sensors.value = demo.sensors;
    history.value = demo.history;
    alerts.value = demo.alerts;
    jobs.value = demo.jobs;
    events.value = demo.events;
    socketStatus.value = "demo";
    lastSync.value = new Date().toISOString();
    error.value = null;
    dataFailures.value = [];
    health.value = Object.fromEntries(services.map((s) => [
      s.id,
      {
        status: ["mailpit"].includes(s.id) ? "offline" : "online",
        latencyMs: 8 + Math.round(Math.random() * 42),
        checkedAt: new Date().toISOString(),
      } satisfies ServiceHealth,
    ]));
    demoTimer = window.setInterval(tickDemo, 3000);
  }
  function tickDemo() {
    const now = new Date().toISOString();
    sensors.value = sensors.value.map((sensor) => {
      const variation = (Math.random() - .5) * .26;
      const temperature = Math.round((sensor.temperature + variation) * 10) /
        10;
      const humidity = Math.min(
        90,
        Math.max(
          20,
          Math.round((sensor.humidity + (Math.random() - .5) * .4) * 10) / 10,
        ),
      );
      return {
        ...sensor,
        temperature,
        humidity,
        updatedAt: now,
        status: (temperature >= 30
          ? "critical"
          : temperature >= 27
          ? "warning"
          : "normal") as Sensor["status"],
      };
    });
    const avg = sensors.value.reduce((s, item) => s + item.temperature, 0) /
      (sensors.value.length || 1);
    const hum = sensors.value.reduce((s, item) => s + item.humidity, 0) /
      (sensors.value.length || 1);
    history.value = [...history.value, {
      timestamp: now,
      temperature: Math.round(avg * 10) / 10,
      humidity: Math.round(hum * 10) / 10,
    }].slice(-120);
    jobs.value = jobs.value.map((job) => {
      if (job.status !== "active" && job.status !== "waiting") return job;
      if (job.status === "waiting" && Math.random() < .5) {
        return { ...job, status: "active", progress: 8 };
      }
      if (job.status !== "active") return job;
      const progress = Math.min(
        100,
        job.progress + 6 + Math.round(Math.random() * 12),
      );
      if (progress === 100) addEvent("job", `${job.name} · traitement terminé`);
      return {
        ...job,
        progress,
        status: progress === 100 ? "completed" : "active",
      };
    });
    if (Math.random() < .4) {
      addEvent(
        "sensor",
        `Mesure MQTT reçue · ${
          sensors.value[Math.floor(Math.random() * sensors.value.length)].id
        }`,
      );
    }
    lastSync.value = now;
  }
  async function pollData(run: number) {
    if (mode.value !== "live" || run !== session) return;
    loading.value = true;
    const requests = await Promise.allSettled([
      getLatestSensors(),
      getSensorHistory("1h"),
      getAlerts(),
      getJobs(),
    ]);
    if (mode.value !== "live" || run !== session) return;
    const names = ["capteurs", "historique", "alertes", "jobs"];
    const failures: string[] = [];
    requests.forEach((result, i) => {
      if (result.status === "rejected") {
        failures.push(`${names[i]} : ${asError(result.reason)}`);
        return;
      }
      if (i === 0) sensors.value = result.value as Sensor[];
      if (i === 1) history.value = result.value as Measurement[];
      if (i === 2) alerts.value = result.value as Alert[];
      if (i === 3) jobs.value = result.value as Job[];
    });
    dataFailures.value = failures;
    error.value = failures.length === requests.length
      ? "Aucune API REST accessible. Vérifie le gateway et les routes."
      : null;
    if (failures.length < requests.length) {
      lastSync.value = new Date().toISOString();
    }
    loading.value = false;
  }
  async function refreshHealth(run = session) {
    if (mode.value !== "live") {
      health.value = Object.fromEntries(
        services.map(
          (s) => [s.id, {
            ...(health.value[s.id] ?? { status: "online" }),
            latencyMs: Math.round(10 + Math.random() * 28),
            checkedAt: new Date().toISOString(),
          }]
        ),
      );
      return;
    }
    const next = await Promise.all(
      services.map(async (s) => [s.id, await checkHealth(s)] as const),
    );
    if (run === session && mode.value === "live") {
      health.value = Object.fromEntries(next);
    }
  }
  function onMeasurement(measurement: Measurement) {
    history.value = [...history.value, measurement].slice(-240);
    lastSync.value = measurement.timestamp;
    if (events.value[0]?.message !== "Nouvelle mesure reçue via Socket.IO") {
      addEvent("sensor", "Nouvelle mesure reçue via Socket.IO");
    }
  }
  function startLive() {
    sensors.value = [];
    history.value = [];
    alerts.value = [];
    jobs.value = [];
    events.value = [];
    health.value = Object.fromEntries(
      services.map((s) => [s.id, { status: "unknown" }]),
    );
    socketStatus.value = "disconnected";
    lastSync.value = null;
    const run = session;
    void pollData(run);
    void refreshHealth(run);
    pollTimer = window.setInterval(() => {
      void pollData(run);
    }, pollMs);
    realtime = connectMeasurements(onMeasurement, (status) => {
      if (run === session && mode.value === "live") socketStatus.value = status;
    });
  }
  function switchMode(next: Mode) {
    if (next === mode.value) return;
    session++;
    stop();
    mode.value = next;
    error.value = null;
    loading.value = false;
    dataFailures.value = [];
    if (next === "demo") startDemo();
    else startLive();
  }
  async function refreshAll() {
    if (mode.value === "demo") {
      tickDemo();
      await refreshHealth();
      return;
    }
    await Promise.all([pollData(session), refreshHealth(session)]);
  }
  async function acknowledge(id: string) {
    const alert = alerts.value.find((a) => a.id === id);
    if (!alert || alert.status !== "active") return;
    if (mode.value === "live") {
      try {
        await acknowledgeAlert(id);
      } catch (e) {
        error.value = `Acquittement impossible : ${asError(e)}`;
        return;
      }
    }
    alerts.value = alerts.value.map((a) =>
      a.id === id ? { ...a, status: "acknowledged" } : a
    );
    addEvent("alert", `Alerte ${id} acquittée`);
  }
  async function createReport() {
    if (busy.value) return;
    busy.value = true;
    try {
      if (mode.value === "live") {
        await createReportJob();
        await pollData(session);
        addEvent("job", "Demande de rapport acceptée par l’API");
      } else {
        const id = `JOB-${++seq}`;
        jobs.value = [{
          id,
          name: "Rapport à la demande",
          type: "BullMQ / rapports",
          status: "waiting",
          progress: 0,
          attempts: 0,
          createdAt: new Date().toISOString(),
        }, ...jobs.value];
        addEvent("job", `Job ${id} ajouté à la file rapports`);
      }
    } catch (e) {
      error.value = `Impossible de créer le rapport : ${asError(e)}`;
    } finally {
      busy.value = false;
    }
  }
  onMounted(() => {
    session++;
    if (mode.value === "demo") startDemo();
    else startLive();
  });
  onUnmounted(() => {
    session++;
    stop();
  });
  return {
    mode,
    sensors,
    history,
    alerts,
    jobs,
    events,
    health,
    socketStatus,
    lastSync,
    loading,
    busy,
    error,
    dataFailures,
    activeAlerts,
    onlineCount,
    avgTemp,
    avgHumidity,
    switchMode,
    refreshAll,
    refreshHealth,
    acknowledge,
    createReport,
  };
}
