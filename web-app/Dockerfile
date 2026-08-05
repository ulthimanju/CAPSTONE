# --- Stage 1: Build ---
FROM node:20.11.0-alpine AS builder

WORKDIR /app

COPY web-app/package*.json ./
RUN npm ci --silent

COPY web-app/ ./
RUN npm run build

# --- Stage 2: Runtime (nginx) ---
FROM nginx:1.25.4-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/health || exit 1


CMD ["nginx", "-g", "daemon off;"]
