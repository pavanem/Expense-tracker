# ---- Build stage --------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /build

COPY frontend/package.json ./
# No package-lock.json is committed yet (fresh project); `npm install` keeps
# this buildable today, switch to `npm ci` once a lockfile is checked in.
RUN npm install

COPY frontend/. .
# VITE_API_BASE_URL defaults to '/api' in src/services/apiClient.js, which is
# exactly what Nginx proxies below — no build-arg needed for the standard
# docker-compose deployment.
RUN npm run build

# ---- Runtime stage --------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /build/dist /usr/share/nginx/html
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY docker/nginx/proxy-common.conf /etc/nginx/proxy-common.conf

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-check-certificate -qO- https://localhost:443 >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
