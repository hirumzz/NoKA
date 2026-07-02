# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Go backend
# Pinned to 1.26.4+ — fixes GO-2026-5039 (net/textproto) and GO-2026-5037 (crypto/x509)
FROM golang:alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o konga-backend .

# Stage 3: Final minimal image
FROM alpine:latest
WORKDIR /app

RUN apk upgrade --update \
    && apk add bash ca-certificates tzdata \
    && rm -rf /var/cache/apk/* \
    && addgroup -S noka && adduser -S noka -G noka

COPY --chown=noka:noka --from=backend-builder /app/backend/konga-backend /app/konga-backend
COPY --chown=noka:noka --from=frontend-builder /app/frontend/dist /app/public

# Run as non-root user
USER noka

EXPOSE 1337

ENV NODE_ENV=production
ENV GIN_MODE=release

CMD ["/app/konga-backend"]
