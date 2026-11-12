import type {
  Alert,
  EventLog,
  Job,
  Measurement,
  Sensor,
} from "../types/domain";

const timeAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

export function createDemoData(): {
  sensors: Sensor[];
  history: Measurement[];
  alerts: Alert[];
  jobs: Job[];
  events: EventLog[];
} {
  const sensors: Sensor[] = [
    {
      id: "ESP-A01",
      name: "Capteur A01",
      zone: "Salle de production A",
      model: "ESP32 + BME280",
      temperature: 23.8,
      humidity: 48.2,
      pressure: 1013.2,
      status: "normal",
      updatedAt: timeAgo(0),
    },
    {
      id: "ESP-A02",
      name: "Capteur A02",
      zone: "Zone d’assemblage",
      model: "ESP32 + BME280",
      temperature: 24.6,
      humidity: 52.4,
      pressure: 1012.8,
      status: "normal",
      updatedAt: timeAgo(0),
    },
    {
      id: "ESP-B01",
      name: "Capteur B01",
      zone: "Local technique",
      model: "ESP32 + BME280",
      temperature: 31.8,
      humidity: 67.1,
      pressure: 1012.1,
      status: "critical",
      updatedAt: timeAgo(0),
    },
    {
      id: "ESP-B02",
      name: "Capteur B02",
      zone: "Stockage matières",
      model: "ESP32 + BME280",
      temperature: 27.4,
      humidity: 59.6,
      pressure: 1013.5,
      status: "warning",
      updatedAt: timeAgo(0),
    },
    {
      id: "ESP-C01",
      name: "Capteur C01",
      zone: "Salle de contrôle",
      model: "ESP32 + BME280",
      temperature: 22.2,
      humidity: 45.8,
      pressure: 1014.0,
      status: "normal",
      updatedAt: timeAgo(0),
    },
  ];
  const history: Measurement[] = Array.from({ length: 65 }, (_, i) => {
    const step = i / 6;
    return {
      timestamp: timeAgo(64 - i),
      temperature: Math.round(
        (25.6 + 1.6 * Math.sin(step) + 0.35 * Math.cos(step * 2.1) +
          i * 0.012) * 10,
      ) / 10,
      humidity: Math.round(
        (51 + 5 * Math.sin(step * 0.78 + 1.3) + 1.2 * Math.cos(step * 0.7)) *
          10,
      ) / 10,
    };
  });
  const alerts: Alert[] = [
    {
      id: "ALT-2048",
      title: "Température critique",
      detail: "31,8 °C détectés · seuil max 30 °C",
      sensorId: "ESP-B01",
      severity: "critical",
      status: "active",
      timestamp: timeAgo(3),
    },
    {
      id: "ALT-2047",
      title: "Humidité élevée",
      detail: "67,1 % HR · local technique",
      sensorId: "ESP-B01",
      severity: "warning",
      status: "active",
      timestamp: timeAgo(8),
    },
    {
      id: "ALT-2046",
      title: "Seuil de vigilance atteint",
      detail: "Température proche du seuil · stockage",
      sensorId: "ESP-B02",
      severity: "warning",
      status: "active",
      timestamp: timeAgo(18),
    },
    {
      id: "ALT-2045",
      title: "Connexion rétablie",
      detail: "Flux MQTT ESP-A01 rétabli",
      sensorId: "ESP-A01",
      severity: "info",
      status: "resolved",
      timestamp: timeAgo(47),
    },
  ];
  const jobs: Job[] = [
    {
      id: "JOB-1064",
      name: "Rapport journalier",
      type: "BullMQ / rapports",
      status: "completed",
      progress: 100,
      attempts: 1,
      createdAt: timeAgo(12),
    },
    {
      id: "JOB-1063",
      name: "Export de mesures",
      type: "BullMQ / rapports",
      status: "active",
      progress: 63,
      attempts: 1,
      createdAt: timeAgo(5),
    },
    {
      id: "JOB-1062",
      name: "Notification email",
      type: "RabbitMQ / alertes",
      status: "completed",
      progress: 100,
      attempts: 1,
      createdAt: timeAgo(8),
    },
    {
      id: "JOB-1061",
      name: "Sauvegarde programmée",
      type: "BullMQ / backups",
      status: "waiting",
      progress: 0,
      attempts: 0,
      createdAt: timeAgo(3),
    },
    {
      id: "JOB-1060",
      name: "Génération PDF",
      type: "BullMQ / rapports",
      status: "failed",
      progress: 24,
      attempts: 3,
      createdAt: timeAgo(58),
    },
  ];
  const events: EventLog[] = [
    {
      id: "EVT-51",
      type: "system",
      message: "Redis PUBLISH → canal measurements",
      timestamp: timeAgo(1),
    },
    {
      id: "EVT-50",
      type: "sensor",
      message: "ESP-A02 · nouvelle mesure reçue",
      timestamp: timeAgo(2),
    },
    {
      id: "EVT-49",
      type: "alert",
      message: "Seuil de température dépassé sur ESP-B01",
      timestamp: timeAgo(3),
    },
    {
      id: "EVT-48",
      type: "job",
      message: "Rapport journalier terminé",
      timestamp: timeAgo(12),
    },
    {
      id: "EVT-47",
      type: "system",
      message: "Socket.IO · connexion établie",
      timestamp: timeAgo(16),
    },
    {
      id: "EVT-46",
      type: "sensor",
      message: "MQTT · souscription capteurs/+/mesures",
      timestamp: timeAgo(31),
    },
  ];
  return { sensors, history, alerts, jobs, events };
}
