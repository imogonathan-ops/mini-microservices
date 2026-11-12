# Terrain Control — Dashboard Vue.js pour microservices IoT

Une **single-page application (SPA)** Vue 3 / Vite / TypeScript, prête à ouvrir dans VS Code. Elle reprend le pipeline ESP32/BME280 → MQTT/Mosquitto → ingestion → Redis + TimescaleDB → Socket.IO, ainsi que les alertes RabbitMQ, les rapports BullMQ et les services polyglottes.

> **Important :** les services réels ne sont **pas inclus** dans ce dossier. Le mode démo fonctionne immédiatement ; les chemins et formats d’API sont des **contrats d’exemple à adapter**, pas des affirmations sur les routes de tes projets actuels.

## Démarrage en 3 commandes

Prérequis : **Node.js 20.19+ ou 22.12+** et npm.

```bash
npm install
cp .env.example .env       # Windows PowerShell : Copy-Item .env.example .env
npm run dev
```

Ouvre **http://localhost:5173**. Le dashboard démarre en **Démo**, avec capteurs, graphiques, alertes, jobs, services et journal simulés. Le bouton **API réelles** permet de vérifier les vrais raccordements.

Pour vérifier le projet :

```bash
npm run build
npm run test
```

## Structure du projet

```text
terrain-control-vue/
├── .env.example                   # Configuration (AUCUN secret navigateur)
├── vite.config.ts                 # Proxy API et Socket.IO en développement
├── src/
│   ├── App.vue                    # Une seule page : toutes les sections
│   ├── assets/style.css           # Design responsive / dark mode
│   ├── components/TrendChart.vue  # Courbe Chart.js
│   ├── composables/useDashboard.ts# État réactif, polling, simulation et WS
│   ├── data/demo.ts               # Données de démonstration locales
│   ├── types/domain.ts            # Types communs
│   └── api/
│       ├── client.ts              # Client HTTP, timeout, Bearer mémoire
│       ├── config.ts              # Gateway ou base URL propre à chaque service
│       ├── registry.ts            # Répertoire services et endpoints
│       ├── normalizers.ts         # Adaptation des JSON polyglottes
│       ├── realtime.ts            # Client Socket.IO + reconnexion
│       └── endpoints/             # DOSSIER POUR TES APIS EXISTANTES
│           ├── sensors.ts         # Capteurs + historiques
│           ├── alerts.ts          # Alertes + acquittement
│           ├── jobs.ts            # Jobs BullMQ + création de rapports
│           ├── auth.ts            # Auth / session
│           ├── health.ts          # Tests de disponibilité
│           └── operations.ts      # Orders, users, état des files (optionnel)
├── tests/normalizers.test.ts
└── docs/RACCORDEMENT.md           # Guide de branchement pas à pas
```

## Comment raccorder tes projets existants

1. Ouvre `terrain-control-vue` dans VS Code **à côté** de tes backends (pas besoin de les copier dans le frontend).
2. Vérifie que ton **API Gateway** route `/api/sensors`, `/api/alerts`, `/api/jobs`, `/api/reports`, `/api/auth`, `/api/health` vers les bons backends. **Ce sont des exemples à adapter**.
3. Modifie les **routes dans `src/api/endpoints/*.ts`** et les formats dans `src/api/normalizers.ts` si tes APIs renvoient d'autres schémas JSON.
4. Modifie les routes de santé dans `src/api/registry.ts` (`healthPath: null` signifie « non instrumenté »).
5. Dans `.env` : `VITE_DATA_MODE=live`, `VITE_API_BASE_URL=/api`. Si tu **n’as pas de gateway**, configure `VITE_SENSORS_API_URL`, `VITE_ALERTS_API_URL`, `VITE_REPORTS_API_URL` et `VITE_AUTH_API_URL` (ainsi que `VITE_ORDERS_API_URL`, `VITE_USERS_API_URL`, `VITE_MONITORING_API_URL` si nécessaire) pour chaque service (l’adressage est centralisé dans `src/api/config.ts`). Pour Socket.IO : `VITE_SOCKET_EVENT=measurement` (à aligner avec ton serveur).
6. Si le gateway n'écoute pas sur `localhost:8080`, change le proxy de `vite.config.ts`. Si ton Socket.IO n'écoute pas sur `localhost:3004`, modifie son proxy ou renseigne `VITE_SOCKET_URL`.
7. Redémarre `npm run dev` après changement des variables `.env` ou du proxy.
8. Active **API réelles**, puis ouvre la section **Endpoints API** et clique **Tester** sur les routes `GET`.

### Règles d'intégration

- Un navigateur **ne se connecte pas directement** à PostgreSQL, Redis, RabbitMQ, Mosquitto ou aux secrets Docker. Seule une API serveur doit accéder à ces systèmes.
- Les appels REST passent par le **gateway** par défaut, ou par les URL de services configurées explicitement dans `.env`. Les événements temps réel arrivent en **Socket.IO**, pas en WebSocket natif (les protocoles ne sont pas interchangeables).
- Le navigateur ne doit jamais contenir de mot de passe, clé privée ou secret AMQP/SMTP/DB. Les variables `VITE_` sont visibles côté client.
- Le mode réel **n'affiche pas de mesures fictives** si les services sont indisponibles.
- L’état « **Non testé** » est différent de « **Injoignable** » : sans route `/health` connue, on ne peut pas conclure à une panne.
- Les actions **Acquitter** (`PATCH`) et **Générer un rapport** (`POST`) effectuent des requêtes réelles uniquement en mode API réelles.
- Pour ajouter un autre service (`orders`, `users`, `backup`...) : enrichis `src/api/registry.ts`, ajoute un fichier `src/api/endpoints/...` et utilise sa fonction depuis `useDashboard.ts` ou un composable dédié.

## Vue d'ensemble des sections

| Section | Source en mode réel |
| --- | --- |
| KPIs + capteurs | `GET /api/sensors/latest` |
| Graphique historique | `GET /api/sensors/history?window=1h` + Socket.IO |
| Alertes | `GET /api/alerts`, `PATCH /api/alerts/:id/ack` |
| Jobs / rapports | `GET /api/jobs`, `POST /api/reports` (202 Accepted conseillé) |
| Santé des services | Les chemins `healthPath` configurés dans `registry.ts` |
| Répertoire des endpoints | Liste déclarative `src/api/registry.ts` |
| Activité récente | Événements de la session navigateur (pas des logs centralisés) |

## Production / Docker

`npm run build` génère `dist/`, un ensemble de fichiers statiques. Sers-les avec Nginx, Caddy ou ton API gateway. Exemple de configuration Nginx : `docs/nginx.example.conf`. Adapte les **noms DNS Docker** aux noms de tes services.

Un fichier `Dockerfile` est fourni pour construire et servir cette SPA. Le proxy Nginx est à configurer dans l'environnement de déploiement ; le conteneur ne présume pas de tes noms de services existants.

## Licence

Projet d'exemple local, libre à adapter à ton architecture et à ton portfolio.
