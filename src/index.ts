import { serve } from "@hono/node-server";
import { authHandler, initAuthConfig } from "@hono/auth-js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env";
import { authBasePath, getAuthConfig } from "./lib/auth";
import reservationsRouter from "./routes/reservations";
import scannerRouter from "./routes/scanner";
import sessionsRouter from "./routes/sessions";

console.log("[SERVER] Starting server initialization...");

const app = new Hono({
  strict: false,
});

console.log("[SERVER] Hono app created");

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: (origin) => {
      console.log("[CORS] Request from origin:", origin);
      if (!origin) return null;
      if (env.NODE_ENV !== "production") {
        console.log("[CORS] Development mode - allowing origin:", origin);
        return origin;
      }
      const FrontendUrls = (env.FRONTEND_URLS ?? "").split(",");
      const AllowedOrigins = new Set(
        FrontendUrls.map((u) => u.trim()).filter(Boolean)
      );
      const allowed = AllowedOrigins.has(origin);
      console.log(
        "[CORS] Production mode - origin",
        origin,
        allowed ? "allowed" : "rejected"
      );
      return allowed ? origin : null;
    },
    credentials: true,
  })
);

console.log("[SERVER] CORS middleware configured");

app.use(
  "*",
  initAuthConfig(() => getAuthConfig())
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

console.log("[SERVER] Registering routes...");

app.use(`${authBasePath}/*`, authHandler());

console.log("[SERVER] Auth routes registered at /auth/*");

app.route("/api", sessionsRouter);
app.route("/api", reservationsRouter);
app.route("/api", scannerRouter);

// Debug: catch all unmatched routes
app.all("*", (c) => {
  console.log(`[DEBUG] Unmatched route: ${c.req.method} ${c.req.path}`);
  console.log(`[DEBUG] Full URL: ${c.req.url}`);
  return c.text(`Route not found: ${c.req.method} ${c.req.path}`, 404);
});

console.log("[SERVER] All routes registered");

console.log("[SERVER] Starting HTTP server...");

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`[SERVER] Server is running on http://localhost:${info.port}`);
    console.log(`[SERVER] Environment: ${env.NODE_ENV}`);
    console.log(`[SERVER] Auth endpoints available at: /auth/*`);
  }
);
