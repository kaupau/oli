# Build frontend
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build backend
FROM golang:1.21 AS backend
RUN apt-get update && apt-get install -y gcc sqlite3 libsqlite3-dev
WORKDIR /app
COPY backend/go.* ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=1 go build -o strudelvibe ./cmd/server

# Final image
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates sqlite3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=backend /app/strudelvibe .
COPY --from=frontend /app/frontend/dist ./static

ENV STATIC_DIR=/app/static
ENV PORT=8080
ENV DB_PATH=/data/strudelvibe.db
ENV UPLOAD_DIR=/data/uploads

EXPOSE 8080

CMD ["./strudelvibe"]
