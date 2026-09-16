# ==============================================================================
# Multi-Stage Production Dockerfile for Astro Static Site
# ==============================================================================

# --- Stage 1: Build & Static Generation ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (utilizing npm cache)
COPY package*.json ./
RUN npm ci

# Copy full repository source
COPY . .

# Type-check and build static distribution bundle into dist/
RUN npm run check && npm run build

# --- Stage 2: Ultra-Lightweight Production Web Server ---
FROM nginx:alpine

# Copy compiled static HTML/assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy tailored Nginx server configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
