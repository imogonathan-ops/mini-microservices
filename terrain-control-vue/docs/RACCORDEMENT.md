# Raccordement : connecter tes microservices existants

## 1. Où brancher quoi ?

| Composant de tes schémas | Exposition au navigateur | Où modifier dans Vue |
| --- | --- | --- |
| ESP32 + BME280 et Mosquitto | Via le backend, **jamais MQTT TCP direct** | `api/endpoints/sensors.ts` |
| ingestion-service (Node.js) | En général aucune route d’UI requise | `api/registry.ts` pour `/health` si disponible |
| TimescaleDB / PostgreSQL | Via sensors-api | `api/endpoints/sensors.ts` |
| Redis (cache + pub/sub) | Via API et realtime-service | `api/realtime.ts` |
| realtime-service (Socket.IO) | Client Socket.IO navigateur | `api/realtime.ts` + `.env` |
| alert-service (Spring Boot) | API GET alertes + PATCH acquittement | `api/endpoints/alerts.ts` |
| notif-service (.NET Worker) | État de santé via API serveur | `api/registry.ts` |
| auth-service (Spring Security) | Login / JWT / identité | `api/endpoints/auth.ts` |
| report-service (Laravel) | API rapports et jobs | `api/endpoints/jobs.ts` |
| RabbitMQ et BullMQ | API d’observabilité dédiée | `api/endpoints/jobs.ts` |
| Grafana / Mailpit / n8n | Liens externes **si exposés volontairement** | À ajouter dans `App.vue` |
| Kubernetes / Docker Compose | API d'administration sécurisée facultative | À développer côté serveur, pas directement depuis Vue |

## 2. Contrat REST proposé (à adapter)

### GET /api/sensors/latest

```json
{
  "sensors": [
    {
      "id": "ESP-A01", "name": "Capteur A01", "zone": "Salle de production A",
      "temperature": 23.8, "humidity": 48.2, "pressure": 1013.2,
      "updatedAt": "2026-11-10T12:00:00Z", "status": "normal"
    }
  ]
}
```

`status` : `normal`, `warning`, `critical`.

### GET /api/sensors/history?window=1h

```json
{
  "measurements": [
    { "timestamp": "2026-11-10T11:59:00Z", "temperature": 23.7, "humidity": 48.1 },
    { "timestamp": "2026-11-10T12:00:00Z", "temperature": 23.8, "humidity": 48.2 }
  ]
}
```

Le graphique attend ici une **série agrégée** (température / humidité). Si ton backend renvoie une série par capteur, ajoute un agrégateur dans `normalizers.ts` ou propose une API d'agrégation.

### GET /api/alerts

```json
{
  "alerts": [
    {
      "id": "ALT-2048", "sensorId": "ESP-B01", "title": "Température critique",
      "detail": "31.8 °C", "severity": "critical", "status": "active",
      "timestamp": "2026-11-10T12:00:00Z"
    }
  ]
}
```

`PATCH /api/alerts/ALT-2048/ack` (authentification nécessaire en production).

### GET /api/jobs

```json
{
  "jobs": [
    {
      "id": "JOB-1064", "name": "Rapport journalier", "type": "rapports",
      "status": "active", "progress": 35, "attempts": 1,
      "createdAt": "2026-11-10T12:00:00Z"
    }
  ]
}
```

`POST /api/reports` avec `{ "type": "daily", "date": "2026-11-10" }`. Répondre `202 Accepted` et un `jobId` plutôt que de bloquer la requête pendant la génération du PDF.

## 3. Socket.IO

Exemple de payload envoyé par `realtime-service` :

```javascript
io.emit('measurement', {
  timestamp: new Date().toISOString(),
  temperature: 24.1,
  humidity: 50.3
})
```

Sur ton frontend, modifier `VITE_SOCKET_EVENT` si l'événement s'appelle `sensor:reading` ou autre. En cas de panne réseau, Socket.IO tente de se reconnecter automatiquement. Pour alimenter les **cartes individuelles**, conserver le polling REST actuel ou enrichir `onMeasurement` pour inclure `sensorId` et mettre à jour le bon capteur.

## 4. Exemple de routage gateway (concept)

```text
Navigateur /api/sensors/*  ──> sensors-api
Navigateur /api/alerts/*   ──> alert-service ou API d'agrégation
Navigateur /api/jobs       ──> report-service / jobs-api
Navigateur /api/reports/*  ──> report-service
Navigateur /api/auth/*     ──> auth-service
Navigateur /socket.io/*    ──> realtime-service
```

Les services ayant seulement un consommateur RabbitMQ (sans HTTP) nécessitent un endpoint de supervision **distinct** : ne pas inventer un HTTP `/health` côté frontend si le service ne l'expose pas.

## 5. Cycle d’intégration recommandé

1. Lancer TimescaleDB, Redis, Mosquitto et les autres services avec ton `docker compose` existant.
2. Vérifier le backend avec `curl` ou le client HTTP VS Code, **avant** de brancher Vue.
3. Renseigner `src/api/endpoints/sensors.ts` avec les vraies routes.
4. Basculer sur **API réelles** ; vérifier les KPIs, la courbe et la table de capteurs.
5. Connecter Socket.IO, puis les alertes et les jobs.
6. Ajouter les routes de santé uniquement pour les services qui les exposent effectivement.
7. Ajouter des tests de contrat JSON, des timeouts, des retries côté serveur, puis l’auth et les autorisations.

## 6. Dépannage

- **Toutes les APIs en erreur** : vérifie `localhost:8080` dans `vite.config.ts`, puis le chemin `/api` du gateway.
- **CORS** : favorise le proxy same-origin plutôt qu'un appel direct à chaque service.
- **404** : le service tourne peut-être bien, mais la route du contrat diffère. Aligne le routeur et `src/api/endpoints/`.
- **Socket.IO déconnecté** : vérifie le port, le chemin `/socket.io/`, le nom de l'événement et les règles CORS si origine différente.
- **Aucune santé des composants RabbitMQ / Redis** : normal tant que l'endpoint serveur de monitoring n'existe pas.
- **Le mode réel est vide** : volontaire en cas d'absence de backend ; revenir en démo permet de vérifier le rendu.

## 7. Sans API Gateway : ports séparés

Si tes services existent déjà chacun sur son port, tu peux commencer **sans Nginx** :

```ini
VITE_DATA_MODE=live
VITE_API_BASE_URL=/api
VITE_SENSORS_API_URL=http://localhost:5100/api
VITE_ALERTS_API_URL=http://localhost:8082/api
VITE_REPORTS_API_URL=http://localhost:8000/api
VITE_AUTH_API_URL=http://localhost:8081/api
VITE_SOCKET_URL=http://localhost:3004
VITE_ORDERS_API_URL=http://localhost:3002/api
VITE_USERS_API_URL=http://localhost:3001/api
VITE_MONITORING_API_URL=http://localhost:8090/api
```

**Ces ports sont des exemples, pas les ports supposés de tes backends.** Ils doivent être remplacés par ceux de ton VS Code/Docker Compose. Pour des origines différentes, chaque backend doit autoriser explicitement le frontend `http://localhost:5173` via CORS, y compris pour les méthodes `PATCH` / `POST`. En production, préfère un gateway commun (même origine) et HTTPS.
