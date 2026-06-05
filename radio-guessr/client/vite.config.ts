import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const SERVER = process.env.SERVER_URL ?? "http://localhost:8787";

// In dev, proxy API + demo audio + websocket to the Node server so the client
// can use same-origin relative URLs everywhere.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": SERVER,
      "/demo": SERVER,
      "/ws": { target: SERVER.replace("http", "ws"), ws: true },
    },
  },
});
