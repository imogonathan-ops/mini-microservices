FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Par défaut : SPA statique. Pour les API, configurer un reverse proxy devant ce conteneur.
COPY docs/nginx.static.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
