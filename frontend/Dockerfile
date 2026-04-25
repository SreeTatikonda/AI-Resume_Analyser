# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: dev — live reloading for local development
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: build — compile the production bundle
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Accept API URL at build time
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3: runtime — serve with nginx
# ──────────────────────────────────────────────────────────────────────────────
FROM nginx:1.29-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Runtime env var for API upstream (default: backend service)
ENV API_UPSTREAM=backend:8000

EXPOSE 80

# Use envsubst to substitute $API_UPSTREAM at container start, then launch nginx
CMD ["/bin/sh", "-c", "envsubst '${API_UPSTREAM}' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp && mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
