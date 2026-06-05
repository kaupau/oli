# RadioGuessr — single-image build. Compiles the React client and the Node
# server, then runs one process that serves both the API/WebSocket and the
# built client. Works on any Docker host (Render, Railway, Fly.io, Cloud Run…).

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first (root postinstall installs server + client) for caching.
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json ./client/
RUN npm install

# Build client and server.
COPY . .
RUN npm --prefix client run build && npm --prefix server run build

# ---- runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Most platforms inject PORT; the server falls back to 8787.
ENV PORT=8787

# Server runtime deps only.
COPY --from=build /app/server/package.json /app/server/package.json
COPY --from=build /app/server/package-lock.json /app/server/package-lock.json
RUN npm --prefix server install --omit=dev

# Compiled server + built client.
COPY --from=build /app/server/dist /app/server/dist
COPY --from=build /app/client/dist /app/client/dist

EXPOSE 8787
CMD ["node", "server/dist/index.js"]
