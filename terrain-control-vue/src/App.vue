<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  Activity, AlertCircle, ArrowDownRight, ArrowRight, Bell, Box, CalendarDays, Check, CheckCheck, ChevronDown,
  CircleAlert, CircleCheck, CircleHelp, Clipboard, Clock3, Cloud, Code2, Cpu, Database,
  FileClock, FileText, Gauge, GitBranch, HardDrive, LayoutDashboard, Menu, MoreHorizontal,
  Network, Play, Radio, RefreshCw, Search, Server, Settings2, ShieldCheck, Terminal, Thermometer,
  Waves, Wifi, X, Zap
} from 'lucide-vue-next'
import TrendChart from './components/TrendChart.vue'
import { useDashboard } from './composables/useDashboard'
import { endpoints, services } from './api/registry'
import { apiUrl, request } from './api/client'
import { targetForService } from './api/config'
import type { EndpointDefinition, JobStatus, Mode, Severity } from './types/domain'

const dashboard = useDashboard()
const {
  mode, sensors, history, alerts, jobs, events, health, socketStatus, lastSync, loading, busy,
  error, dataFailures, activeAlerts, onlineCount, avgTemp, avgHumidity,
  switchMode, refreshAll, refreshHealth, acknowledge, createReport
} = dashboard;
const nav = [
  { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { id: 'sensors', label: 'Capteurs & mesures', icon: Thermometer },
  { id: 'alerts', label: 'Alertes', icon: Bell },
  { id: 'jobs', label: 'Jobs & workers', icon: GitBranch },
  { id: 'services', label: 'Microservices', icon: Server },
  { id: 'api', label: 'Endpoints API', icon: Code2 },
  { id: 'architecture', label: 'Architecture', icon: Network }
];
const activeNav = ref('overview')
const mobileMenuOpen = ref(false)
const alertFilter = ref<'all' | 'active' | 'resolved'>('all')
const chartMetric = ref<'temperature' | 'humidity'>('temperature')
const chartRange = ref<'15m' | '30m' | '1h'>('1h')
const chartRanges = ['15m', '30m', '1h'] as const
const serviceSearch = ref('')
const apiSearch = ref('')
const showAllServices = ref(false)
const selectedApi = ref<string | null>(null)
const apiTestOutput = ref('')
const testingApi = ref(false)
const toast = ref('')
const currentTime = ref(new Date())
let clockTimer: number | undefined
let toastTimer: number | undefined

onMounted(() => { clockTimer = window.setInterval(() => currentTime.value = new Date(), 1000) })
onUnmounted(() => { if (clockTimer) window.clearInterval(clockTimer); if (toastTimer) window.clearTimeout(toastTimer) })
const clock = computed(() => currentTime.value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
const today = computed(() => currentTime.value.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
const tempText = computed(() => avgTemp.value === null ? '—' : avgTemp.value.toFixed(1).replace('.', ','))
const humText = computed(() => avgHumidity.value === null ? '—' : Math.round(avgHumidity.value).toString())
const activeCritical = computed(() => activeAlerts.value.filter(a => a.severity === 'critical').length)
const filteredAlerts = computed(() => alerts.value.filter(a => alertFilter.value === 'all' ? true : alertFilter.value === 'active' ? a.status === 'active' : a.status !== 'active'))
const filteredServices = computed(() => {
  const q = serviceSearch.value.toLowerCase().trim()
  const result = services.filter(s => !q || `${s.label} ${s.stack} ${s.description}`.toLowerCase().includes(q))
  return showAllServices.value || q ? result : result.slice(0, 8)
})
const filteredEndpoints = computed(() => {
  const q = apiSearch.value.toLowerCase().trim()
  return endpoints.filter(e => !q || `${e.service} ${e.path} ${e.method} ${e.description}`.toLowerCase().includes(q))
})
const displayedHistory = computed(() => {
  const minutes = chartRange.value === '15m' ? 15 : chartRange.value === '30m' ? 30 : 60
  const cutoff = Date.now() - minutes * 60_000
  return history.value.filter(p => new Date(p.timestamp).getTime() >= cutoff)
})
const updatedLabel = computed(() => lastSync.value ? new Date(lastSync.value).toLocaleTimeString('fr-FR') : 'Jamais synchronisé')
const connectedLabel = computed(() => mode.value === 'demo' ? 'Simulation active' : socketStatus.value === 'connected' ? 'Socket.IO connecté' : 'Socket.IO déconnecté')
const measuredServices = computed(() => services.filter(s => health.value[s.id]?.status !== 'unknown').length)
const servicePct = computed(() => measuredServices.value ? Math.round(onlineCount.value / measuredServices.value * 100) : 0)
const apiRoot = computed(() => apiUrl('').replace(/\/$/, ''))

function goto(id: string) {
  activeNav.value = id
  mobileMenuOpen.value = false
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function notify(message: string) {
  toast.value = message
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.value = '', 2900)
}
function shortTime(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function timeFromNow(value: string) {
  const delta = Math.max(0, Math.floor((currentTime.value.getTime() - new Date(value).getTime()) / 60000))
  return delta < 1 ? 'À l’instant' : delta < 60 ? `Il y a ${delta} min` : `Il y a ${Math.floor(delta / 60)} h`
}
const severityTitle: Record<Severity, string> = { critical: 'Critique', warning: 'Attention', info: 'Info' }
const jobLabels: Record<JobStatus, string> = { waiting: 'En attente', active: 'En cours', completed: 'Terminé', failed: 'Échec' }
function handleMode(value: Mode) { switchMode(value); notify(value === 'demo' ? 'Simulation activée' : 'Mode réel : connexion aux API en cours') }
async function handleReport() { await createReport(); if (!error.value) notify(mode.value === 'demo' ? 'Rapport ajouté à la file (simulation)' : 'Demande de rapport envoyée') }
async function handleAck(id: string) { await acknowledge(id); if (!error.value) notify('Alerte acquittée') }
async function handleRefresh() { await refreshAll(); notify(mode.value === 'demo' ? 'Données de démonstration actualisées' : 'Requête de rafraîchissement terminée') }
async function copyPath(endpoint: EndpointDefinition) {
  try { await navigator.clipboard.writeText(apiUrl(endpoint.path, targetForService(endpoint.service))); notify('Adresse API copiée') }
  catch { notify('Copie indisponible dans ce navigateur') }
}
async function testEndpoint(endpoint: EndpointDefinition) {
  if (!endpoint.readOnly || endpoint.path.includes(':')) return
  selectedApi.value = endpoint.id
  testingApi.value = true
  try {
    if (mode.value === 'demo') {
      const demoPayload = endpoint.id === 'sensor-latest' ? { sensors: sensors.value.slice(0, 2) }
        : endpoint.id === 'sensor-history' ? { measurements: history.value.slice(-3) }
          : endpoint.id === 'alerts-list' ? { alerts: alerts.value.slice(0, 2) }
            : endpoint.id === 'jobs-list' ? { jobs: jobs.value.slice(0, 2) }
              : { status: 'ok', mode: 'demo', warning: 'Réponse simulée, aucune API appelée' }
      apiTestOutput.value = JSON.stringify({ mode: 'simulation', url: apiUrl(endpoint.path, targetForService(endpoint.service)), response: demoPayload }, null, 2)
    } else {
      const result = await request<unknown>(endpoint.path, {}, targetForService(endpoint.service))
      apiTestOutput.value = JSON.stringify({ mode: 'reel', url: apiUrl(endpoint.path, targetForService(endpoint.service)), response: result }, null, 2)
    }
  } catch (e) {
    apiTestOutput.value = JSON.stringify({ error: e instanceof Error ? e.message : String(e), url: apiUrl(endpoint.path, targetForService(endpoint.service)) }, null, 2)
  } finally { testingApi.value = false }
}
const flow = [
  { name: 'ESP32', detail: 'BME280', icon: Cpu },
  { name: 'Mosquitto', detail: 'MQTT', icon: Radio },
  { name: 'Ingestion', detail: 'Node.js', icon: Box },
  { name: 'Redis', detail: 'Pub/Sub', icon: Database },
  { name: 'Realtime', detail: 'Socket.IO', icon: Waves },
  { name: 'Vue.js', detail: 'Dashboard', icon: Gauge }
]
</script>

<template>
  <div class="shell">
    <div class="mobile-overlay" v-if="mobileMenuOpen" @click="mobileMenuOpen = false" />
    <aside class="sidebar" :class="{ 'sidebar-open': mobileMenuOpen }">
      <div class="brand" @click="goto('overview')" role="button" tabindex="0" @keydown.enter="goto('overview')">
        <div class="brand-mark">
          <Activity :size="23" :stroke-width="2.7" />
        </div>
        <div>
          <div class="brand-name">TERRAIN<span>CONTROL</span></div>
          <div class="brand-sub">MICROSERVICES OBSERVABILITY</div>
        </div>
      </div>
      <div class="workspace-select">
        <div class="workspace-avatar">
          <Cpu :size="20" />
        </div>
        <div><strong>Usine connectée</strong><span>Espace de travail</span></div>
        <ChevronDown :size="15" class="muted-icon" />
      </div>
      <div class="sidebar-label">ESPACE DE SUPERVISION</div>
      <nav aria-label="Navigation principale">
        <button v-for="item in nav" :key="item.id" class="nav-link" :class="{ 'nav-active': activeNav === item.id }"
          @click="goto(item.id)">
          <component :is="item.icon" :size="18" :stroke-width="1.9" /><span>{{ item.label }}</span>
          <span v-if="item.id === 'alerts' && activeAlerts.length" class="nav-count">{{ activeAlerts.length }}</span>
        </button>
      </nav>
      <div class="sidebar-label sidebar-tools-label">OUTILS & INFRASTRUCTURE</div>
      <div class="sidebar-extras">
        <button class="nav-link" @click="goto('services')">
          <HardDrive :size="18" /><span>Docker / Kubernetes</span>
        </button>
        <button class="nav-link" @click="goto('jobs')">
          <FileClock :size="18" /><span>Files d’attente</span>
        </button>
        <button class="nav-link" @click="goto('api')">
          <Settings2 :size="18" /><span>Configuration API</span>
        </button>
      </div>
      <div class="sidebar-bottom">
        <div class="system-card">
          <div class="system-header">
            <div class="pulse-dot" :class="{ 'pulse-red': mode === 'live' && socketStatus !== 'connected' }" />{{ mode
              === 'demo' ? 'ENVIRONNEMENT DÉMO' : 'ENVIRONNEMENT RÉEL' }}
          </div>
          <strong>{{ mode === 'demo' ? 'Prêt à explorer' : 'Connexions actives' }}</strong>
          <span>{{ mode === 'demo' ? 'Données simulées, aucune API requise.' : 'Données provenant uniquement de tes API.' }}</span>
        </div>
        <div class="sidebar-foot">
          <div class="footer-avatar">TC</div>
          <div><strong>Terrain Control</strong><span>Vue 3 · Version 1.0</span></div>
          <MoreHorizontal :size="18" />
        </div>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="topbar-left"><button class="mobile-menu icon-button" aria-label="Ouvrir le menu"
            @click="mobileMenuOpen = true">
            <Menu :size="22" />
          </button><span class="breadcrumb-dim">Workspace</span><span class="breadcrumb-slash">/</span><span>Centre de
            supervision</span></div>
        <div class="topbar-right">
          <div class="topbar-date">
            <Clock3 :size="15" />{{ clock }}
          </div>
          <div class="topbar-divider"></div>
          <div class="profile-circle">TC</div>
        </div>
      </header>

      <div class="page-body">
        <section id="overview" class="overview-section">
          <div class="page-title-row">
            <div>
              <div class="eyebrow"><span class="eyebrow-line"></span> PLATEFORME IoT · VUE D’ENSEMBLE</div>
              <h1>Centre de supervision<span class="title-dot">.</span></h1>
              <p class="page-subtitle">Supervisez vos capteurs, microservices et traitements depuis un seul espace.</p>
            </div>
            <div class="page-actions">
              <div class="mode-switch" role="group" aria-label="Mode de données"><button
                  :class="{ selected: mode === 'demo' }" @click="handleMode('demo')">Démo</button><button
                  :class="{ selected: mode === 'live' }" @click="handleMode('live')">API réelles</button></div><button
                class="refresh-button" @click="handleRefresh" :disabled="loading">
                <RefreshCw :size="17" :class="{ rotating: loading }" /> <span>Actualiser</span>
              </button>
            </div>
          </div>
          <div class="operational-strip">
            <div class="strip-left"><span class="live-signal"><span></span>{{ connectedLabel }}</span><span
                class="strip-divider">|</span><span>Dernière synchronisation : <strong>{{ updatedLabel
                  }}</strong></span></div>
            <div class="strip-right">
              <CalendarDays :size="15" /><span class="today-capitalize">{{ today }}</span><span
                class="strip-divider">|</span><span>{{ mode === 'demo' ? 'Environnement de démonstration' :
                  'Environnement connecté' }}</span>
            </div>
          </div>
          <div v-if="mode === 'live'" class="info-banner">
            <CircleHelp :size="17" /><span>Mode réel : les indicateurs restent vides tant que tes API ne répondent pas.
              Aucun chiffre de démonstration n’est présenté comme réel.</span><button @click="goto('api')">Configurer
              <ArrowRight :size="14" />
            </button>
          </div>
          <div v-if="error" class="error-banner">
            <CircleAlert :size="17" /><span>{{ error }}</span><button @click="handleRefresh">Réessayer</button>
          </div>
          <div v-if="mode === 'live' && dataFailures.length" class="failure-inline">Routes à vérifier : {{
            dataFailures.map(i => i.split(' : ')[0]).join(', ')}} <button @click="goto('api')">Voir les
              endpoints</button></div>
          <div class="kpi-grid">
            <div class="kpi-card kpi-teal">
              <div class="kpi-top"><span>Température moyenne</span>
                <div class="kpi-icon">
                  <Thermometer :size="19" />
                </div>
              </div>
              <div class="kpi-value">{{ tempText }}<small v-if="avgTemp !== null">°C</small></div>
              <div class="kpi-bottom"><span class="kpi-trend">
                  <Activity :size="14" /> Temps réel
                </span><span>Capteurs connectés</span></div>
            </div>
            <div class="kpi-card kpi-blue">
              <div class="kpi-top"><span>Humidité moyenne</span>
                <div class="kpi-icon">
                  <Waves :size="19" />
                </div>
              </div>
              <div class="kpi-value">{{ humText }}<small v-if="avgHumidity !== null">%</small></div>
              <div class="kpi-bottom"><span class="kpi-trend">
                  <Waves :size="14" /> Ambiante
                </span><span>Sur l’ensemble des zones</span></div>
            </div>
            <div class="kpi-card kpi-violet">
              <div class="kpi-top"><span>Capteurs supervisés</span>
                <div class="kpi-icon">
                  <Cpu :size="19" />
                </div>
              </div>
              <div class="kpi-value">{{ sensors.length }}<small class="kpi-suffix"> actifs</small></div>
              <div class="kpi-bottom"><span class="kpi-trend">
                  <Wifi :size="14" /> {{ sensors.length ? 'Flux disponible' : 'En attente' }}
                </span><span>ESP32 · BME280</span></div>
            </div>
            <div class="kpi-card kpi-orange">
              <div class="kpi-top"><span>Alertes actives</span>
                <div class="kpi-icon">
                  <Bell :size="19" />
                </div>
              </div>
              <div class="kpi-value">{{ activeAlerts.length }}<small class="kpi-suffix"> en cours</small></div>
              <div class="kpi-bottom"><span class="kpi-trend danger-trend">
                  <AlertCircle :size="14" /> {{ activeCritical }} critique{{ activeCritical > 1 ? 's' : '' }}
                </span><button class="text-cta" @click="goto('alerts')">Voir les alertes
                  <ArrowRight :size="14" />
                </button></div>
            </div>
          </div>
          <div class="dashboard-grid">
            <div class="panel chart-panel">
              <div class="panel-heading">
                <div>
                  <div class="panel-tag">ANALYSE EN TEMPS RÉEL</div>
                  <h2>Évolution des mesures</h2>
                  <p>Historique consolidé des capteurs</p>
                </div>
                <div class="inline-switch"><button :class="{ active: chartMetric === 'temperature' }"
                    @click="chartMetric = 'temperature'">
                    <Thermometer :size="14" /> Température
                  </button><button :class="{ active: chartMetric === 'humidity' }"
                    @click="chartMetric = 'humidity'">Humidité</button></div>
              </div>
              <div class="chart-meta">
                <div class="chart-current">{{ chartMetric === 'temperature' ? tempText : humText }}<span>{{ chartMetric
                  === 'temperature' ? '°C' : '%' }}</span><small> Moyenne actuelle</small></div>
                <div class="chart-period"><button v-for="range in chartRanges" :key="range"
                    :class="{ active: chartRange === range }" @click="chartRange = range">{{ range }}</button></div>
              </div>
              <TrendChart :metric="chartMetric" :points="displayedHistory" />
              <div class="chart-legend"><span class="legend-dot"
                  :class="chartMetric === 'humidity' ? 'blue-dot' : ''"></span>{{ chartMetric === 'temperature' ?
                    'Température (°C)' : 'Humidité relative (%)' }}<span class="legend-note">Actualisation
                  automatique</span></div>
            </div>
            <div class="panel status-panel">
              <div class="panel-heading">
                <div>
                  <div class="panel-tag">ÉTAT DU SYSTÈME</div>
                  <h2>Infrastructure</h2>
                  <p>Vue des connexions</p>
                </div><span class="mini-status">{{ mode === 'demo' ? 'SIMULÉ' : 'DIAGNOSTIC' }}</span>
              </div>
              <div class="uptime-visual">
                <div class="uptime-ring" :style="{ '--percent': servicePct + '%' }">
                  <div><strong>{{ servicePct }}<small>%</small></strong><span>Disponibilité*</span></div>
                </div>
                <div class="uptime-summary"><strong>{{ onlineCount }} / {{ measuredServices }}</strong><span>services
                    vérifiés</span>
                  <div class="uptime-mark"><span></span>{{ mode === 'demo' ? 'Simulation de santé' : 'Sur routes configurées' }}</div>
                </div>
              </div>
              <div class="status-items">
                <div><span><span class="service-indicator"
                      :class="socketStatus === 'connected' || mode === 'demo' ? 'online' : 'offline'"></span>Flux
                    Socket.IO</span><strong>{{ mode === 'demo' ? 'Simulé' : socketStatus === 'connected' ? 'Connecté' :
                      'Déconnecté' }}</strong></div>
                <div><span><span class="service-indicator" :class="onlineCount ? 'online' : 'unknown'"></span>API
                    Gateway</span><strong>{{ mode === 'demo' ? 'Simulé' : health['gateway']?.status === 'online' ?
                      'Accessible' : health['gateway']?.status === 'offline' ? 'Injoignable' : 'Non testé' }}</strong>
                </div>
                <div><span><span class="service-indicator unknown"></span>RabbitMQ / Redis</span><strong>{{ mode ===
                  'demo' ? 'Simulé' : 'À instrumenter' }}</strong></div>
              </div>
              <button class="full-link" @click="goto('services')">Explorer les microservices
                <ArrowRight :size="16" />
              </button>
              <p class="footnote">* Parmi les routes de santé testées ; non configuré ≠ hors ligne.</p>
            </div>
          </div>
        </section>

        <section id="sensors" class="content-section">
          <div class="section-title">
            <div><span class="section-number">01 / ACQUISITION</span>
              <h2>Capteurs & mesures <span class="section-icon">
                  <Cpu :size="19" />
                </span></h2>
              <p>Suivi des données remontées via MQTT, Redis et TimescaleDB.</p>
            </div>
            <div class="section-side"><span class="section-counter">{{ sensors.length }} capteurs</span><span
                class="section-status"><span class="pulse-dot"></span> Actualisation continue</span></div>
          </div>
          <div class="panel table-panel">
            <div class="table-wrap">
              <table class="data-table sensor-table">
                <thead>
                  <tr>
                    <th>CAPTEUR</th>
                    <th>ZONE</th>
                    <th>TEMPÉRATURE</th>
                    <th>HUMIDITÉ</th>
                    <th>PRESSION</th>
                    <th>DERNIÈRE MESURE</th>
                    <th>ÉTAT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="sensor in sensors" :key="sensor.id">
                    <td>
                      <div class="table-identity">
                        <div class="device-icon">
                          <Cpu :size="17" />
                        </div>
                        <div><strong>{{ sensor.name }}</strong><small>{{ sensor.id }}</small></div>
                      </div>
                    </td>
                    <td class="table-secondary">{{ sensor.zone }}</td>
                    <td><strong class="temp-number">{{ sensor.temperature.toFixed(1).replace('.', ',') }} °C</strong>
                      <div class="tiny-meter"><span
                          :style="{ width: Math.min(100, sensor.temperature / 40 * 100) + '%' }"
                          :class="sensor.status"></span></div>
                    </td>
                    <td class="table-secondary">{{ sensor.humidity.toFixed(1).replace('.', ',') }} %</td>
                    <td class="table-secondary">{{ sensor.pressure.toFixed(1).replace('.', ',') }} hPa</td>
                    <td class="table-secondary">{{ shortTime(sensor.updatedAt) }}</td>
                    <td><span class="state-pill" :class="sensor.status"><span></span>{{ sensor.status === 'normal' ?
                      'Normal' : sensor.status === 'warning' ? 'Vigilance' : 'Critique' }}</span></td>
                  </tr>
                  <tr v-if="!sensors.length">
                    <td colspan="7" class="table-empty">Aucune mesure disponible. Vérifie la route
                      <code>/api/sensors/latest</code>.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="table-footer"><span>
                <Radio :size="14" /> Protocole MQTT · capteurs/+/mesures
              </span><span>Source : {{ mode === 'demo' ? 'simulation locale' : 'sensors-api' }}</span></div>
          </div>
        </section>

        <div class="lower-grid">
          <section id="alerts" class="content-section">
            <div class="section-title compact">
              <div><span class="section-number">02 / SURVEILLANCE</span>
                <h2>Alertes <span class="section-icon orange-icon">
                    <Bell :size="18" />
                  </span></h2>
                <p>Surveillance des seuils et anomalies détectées.</p>
              </div>
            </div>
            <div class="panel alerts-panel">
              <div class="panel-toolbar">
                <div class="filter-pills"><button :class="{ active: alertFilter === 'all' }"
                    @click="alertFilter = 'all'">Toutes</button><button :class="{ active: alertFilter === 'active' }"
                    @click="alertFilter = 'active'">Actives <b>{{ activeAlerts.length }}</b></button><button
                    :class="{ active: alertFilter === 'resolved' }" @click="alertFilter = 'resolved'">Traitées</button>
                </div><span class="panel-toolbar-meta">{{ filteredAlerts.length }} résultat(s)</span>
              </div>
              <div class="alert-list">
                <div v-for="alert in filteredAlerts" :key="alert.id" class="alert-row">
                  <div class="alert-symbol" :class="alert.severity">
                    <AlertCircle v-if="alert.severity !== 'info'" :size="20" />
                    <CircleCheck v-else :size="20" />
                  </div>
                  <div class="alert-copy">
                    <div class="alert-line"><strong>{{ alert.title }}</strong><span class="severity-label"
                        :class="alert.severity">{{ severityTitle[alert.severity] }}</span></div>
                    <p>{{ alert.detail }}</p><span class="alert-time">{{ alert.sensorId }} · {{
                      timeFromNow(alert.timestamp) }}</span>
                  </div><button v-if="alert.status === 'active'" class="ack-button" :title="'Acquitter ' + alert.id"
                    @click="handleAck(alert.id)">
                    <Check :size="15" /> Acquitter
                  </button><span v-else class="treated-label">
                    <CheckCheck :size="15" /> Traité
                  </span>
                </div>
                <div v-if="!filteredAlerts.length" class="list-empty">Aucune alerte dans cette catégorie.</div>
              </div><button class="bottom-action" @click="alertFilter = 'all'">Afficher toutes les alertes
                <ArrowRight :size="15" />
              </button>
            </div>
          </section>
          <section id="jobs" class="content-section">
            <div class="section-title compact">
              <div><span class="section-number">03 / TRAITEMENTS</span>
                <h2>Jobs & workers <span class="section-icon purple-icon">
                    <GitBranch :size="18" />
                  </span></h2>
                <p>Files BullMQ, RabbitMQ et traitements asynchrones.</p>
              </div>
            </div>
            <div class="panel jobs-panel">
              <div class="panel-toolbar">
                <div class="queue-label">
                  <div class="queue-icon">
                    <Zap :size="17" />
                  </div>
                  <div><strong>File de traitements</strong><span>{{jobs.filter(j => j.status === 'active' || j.status
                    === 'waiting').length }} job(s) en attente ou en cours</span></div>
                </div><button class="small-primary" :disabled="busy" @click="handleReport">
                  <Play :size="14" /> Générer un rapport
                </button>
              </div>
              <div class="jobs-list">
                <div v-for="job in jobs.slice(0, 5)" :key="job.id" class="job-row">
                  <div class="job-mark" :class="job.status">
                    <FileText :size="17" />
                  </div>
                  <div class="job-info">
                    <div class="job-line"><strong>{{ job.name }}</strong><span class="job-pill" :class="job.status">{{
                      jobLabels[job.status] }}</span></div>
                    <div class="job-sub"><span>{{ job.id }}</span><span>·</span><span>{{ job.type }}</span></div>
                    <div class="job-progress" v-if="job.status === 'active' || job.status === 'waiting'"><span
                        :style="{ width: job.progress + '%' }"></span></div>
                  </div><span class="job-percent">{{ job.status === 'completed' ? '100%' : job.status === 'failed' ? '×'
                    : job.progress + '%' }}</span>
                </div>
                <div v-if="!jobs.length" class="list-empty">Aucun job reçu. Vérifie la route <code>/api/jobs</code>.
                </div>
              </div>
              <div class="jobs-footer"><span><span class="service-indicator online"></span> Concurrence
                  configurable</span><span>DLQ après échecs répétés</span></div>
            </div>
          </section>
        </div>

        <section id="services" class="content-section">
          <div class="section-title">
            <div><span class="section-number">04 / INFRASTRUCTURE</span>
              <h2>Microservices <span class="section-icon">
                  <Server :size="18" />
                </span></h2>
              <p>Inventaire des composants et contrôle des endpoints de santé.</p>
            </div>
            <div class="section-side">
              <div class="search-wrap">
                <Search :size="16" /><input v-model="serviceSearch" type="search" placeholder="Rechercher un service…"
                  aria-label="Rechercher un service" />
              </div><button class="subtle-button" @click="refreshHealth()">
                <RefreshCw :size="15" /> Tester les services
              </button>
            </div>
          </div>
          <div class="services-grid">
            <div v-for="service in filteredServices" :key="service.id" class="service-card">
              <div class="service-top">
                <div class="service-main-icon" :class="service.category === 'infrastructure' ? 'infra-icon' : ''">
                  <Database v-if="service.category === 'infrastructure'" :size="20" />
                  <Server v-else :size="20" />
                </div><span class="state-pill"
                  :class="health[service.id]?.status === 'online' ? 'normal' : health[service.id]?.status === 'offline' ? 'critical' : 'unknown'"><span></span>{{
                    health[service.id]?.status === 'online' ? (mode === 'demo' ? 'Simulé OK' : 'En ligne') :
                      health[service.id]?.status === 'offline' ? (mode === 'demo' ? 'Simulé KO' : 'Injoignable') : 'Non testé' }}</span>
              </div><strong class="service-name">{{ service.label }}</strong>
              <p>{{ service.description }}</p>
              <div class="service-card-foot"><span>{{ service.stack }}</span><span
                  v-if="health[service.id]?.latencyMs !== undefined && service.healthPath">{{
                    health[service.id].latencyMs }} ms</span><span v-else>{{ service.healthPath ? '—' : 'Route à définir'
                  }}</span></div>
            </div>
          </div>
          <div class="services-bottom"><span>
              <CircleHelp :size="15" /> La santé des brokers et bases nécessite une API serveur, pas un accès direct
              depuis Vue.
            </span><button @click="showAllServices = !showAllServices">{{ showAllServices ? 'Réduire la liste' : `Voir
              tous les services (${services.length})` }}
              <ChevronDown :size="16" :class="{ flipped: showAllServices }" />
            </button></div>
        </section>

        <section id="api" class="content-section">
          <div class="section-title">
            <div><span class="section-number">05 / INTÉGRATION</span>
              <h2>Répertoire des endpoints API <span class="section-icon purple-icon">
                  <Code2 :size="19" />
                </span></h2>
              <p>Tous les points de raccordement au même endroit, avec test des routes GET.</p>
            </div>
            <div class="section-side">
              <div class="search-wrap">
                <Search :size="16" /><input v-model="apiSearch" type="search" placeholder="Service, route, méthode…"
                  aria-label="Rechercher une route API" />
              </div>
            </div>
          </div>
          <div class="panel api-panel">
            <div class="api-header">
              <div>
                <div class="api-badge">
                  <Cloud :size="14" /> API GATEWAY
                </div><strong>{{ apiRoot }}</strong><span>Contrats proposés — adapter les chemins aux services
                  existants</span>
              </div>
              <div class="api-counter"><strong>{{ endpoints.length }}</strong><span>routes référencées</span></div>
            </div>
            <div class="table-wrap">
              <table class="data-table api-table">
                <thead>
                  <tr>
                    <th>MÉTHODE</th>
                    <th>ENDPOINT</th>
                    <th>SERVICE</th>
                    <th>DESCRIPTION</th>
                    <th>TEST</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="endpoint in filteredEndpoints" :key="endpoint.id"
                    :class="{ 'api-row-active': selectedApi === endpoint.id }">
                    <td><span class="method-pill" :class="endpoint.method.toLowerCase()">{{ endpoint.method }}</span>
                    </td>
                    <td><button class="endpoint-path" @click="copyPath(endpoint)"
                        :title="'Copier ' + apiUrl(endpoint.path, targetForService(endpoint.service))"><code>{{ apiUrl(endpoint.path, targetForService(endpoint.service)) }}</code>
                        <Clipboard :size="13" />
                      </button></td>
                    <td class="table-secondary">{{ endpoint.service }}</td>
                    <td class="table-secondary">{{ endpoint.description }}</td>
                    <td><button v-if="endpoint.readOnly" class="test-button" @click="testEndpoint(endpoint)"
                        :disabled="testingApi">
                        <Play :size="13" /> Tester
                      </button><span v-else class="write-badge">Écriture</span></td>
                  </tr>
                  <tr v-if="!filteredEndpoints.length">
                    <td colspan="5" class="table-empty">Aucune route correspondante.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="api-response" v-if="selectedApi">
              <div class="api-response-head"><span>
                  <Terminal :size="15" /> Résultat du test <small>{{ mode === 'demo' ? '· réponse simulée' : '· appel réseau réel' }}</small>
                </span><button @click="selectedApi = null">
                  <X :size="15" />
                </button></div>
              <pre>{{ apiTestOutput }}</pre>
            </div>
            <div class="api-foot"><span>
                <ShieldCheck :size="16" /> Les accès JWT passent par le gateway. Aucun secret dans le frontend.
              </span><span>Socket.IO : {{ mode === 'demo' ? 'simulation' : socketStatus }}</span></div>
          </div>
        </section>

        <section id="architecture" class="content-section">
          <div class="section-title">
            <div><span class="section-number">06 / ARCHITECTURE</span>
              <h2>Parcours de la donnée <span class="section-icon">
                  <Network :size="19" />
                </span></h2>
              <p>Du capteur physique jusqu’au navigateur, en temps réel.</p>
            </div>
          </div>
          <div class="panel architecture-panel">
            <div class="arch-heading">
              <div><strong>Pipeline d’acquisition</strong><span>Lecture → MQTT → Persistance → Diffusion →
                  Interface</span></div><span class="arch-tag"><span class="pulse-dot"></span> {{ mode === 'demo' ?
                    'Schéma de principe' : 'Architecture cible' }}</span>
            </div>
            <div class="flow-diagram"><template v-for="(node, i) in flow" :key="node.name">
                <div class="flow-node">
                  <div class="flow-node-icon" :class="'flow-color-' + i">
                    <component :is="node.icon" :size="23" />
                  </div><strong>{{ node.name }}</strong><span>{{ node.detail }}</span>
                </div>
                <div class="flow-arrow" v-if="i < flow.length - 1">
                  <ArrowRight :size="19" />
                </div>
              </template>
            </div>
            <div class="arch-secondary">
              <div><span class="arch-branch">
                  <Database :size="17" />
                </span><strong>TimescaleDB</strong><span>Historique & rapports</span></div>
              <div><span class="arch-branch orange-branch">
                  <Bell :size="17" />
                </span><strong>RabbitMQ → notifications</strong><span>Alertes, emails & workers</span></div>
              <div><span class="arch-branch violet-branch">
                  <FileClock :size="17" />
                </span><strong>Redis / BullMQ</strong><span>Jobs, retries & DLQ</span></div>
            </div>
          </div>
        </section>

        <section class="content-section logs-section">
          <div class="section-title compact">
            <div><span class="section-number">07 / JOURNAL</span>
              <h2>Activité récente <span class="section-icon">
                  <Activity :size="18" />
                </span></h2>
              <p>Événements reçus dans cette session.</p>
            </div><span class="log-note">{{ mode === 'demo' ? 'Journal simulé' : 'Événements côté interface' }}</span>
          </div>
          <div class="panel log-panel">
            <div v-for="event in events.slice(0, 6)" :key="event.id" class="log-line"><span class="log-icon"
                :class="event.type">
                <Bell v-if="event.type === 'alert'" :size="15" />
                <FileText v-else-if="event.type === 'job'" :size="15" />
                <Cpu v-else-if="event.type === 'sensor'" :size="15" />
                <Terminal v-else :size="15" />
              </span><span class="log-message">{{ event.message }}</span><time>{{ shortTime(event.timestamp) }}</time>
            </div>
            <div v-if="!events.length" class="list-empty">Aucun événement enregistré pour le moment.</div>
          </div>
        </section>
        <footer class="site-footer"><span><span class="footer-symbol">
              <Activity :size="15" />
            </span> TERRAIN CONTROL <span class="footer-muted">/ Conçu pour une architecture
              polyglotte</span></span><span>Vue.js 3 <span class="footer-separator">·</span> Vite <span
              class="footer-separator">·</span> TypeScript <span class="footer-separator">·</span> Socket.IO
            <ArrowDownRight :size="15" />
          </span></footer>
      </div>
    </main>
    <div v-if="toast" class="toast">
      <Check :size="16" />{{ toast }}
    </div>
  </div>
</template>
