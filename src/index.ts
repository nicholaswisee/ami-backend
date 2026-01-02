import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env";
import { auth } from "./lib/auth";
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

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

console.log("[SERVER] Registering routes...");

app.on(["POST", "GET"], "/auth/*", (c) => {
  console.log(`[AUTH] ${c.req.method} ${c.req.url}`);
  console.log(`[AUTH] Headers:`, Object.fromEntries(c.req.raw.headers));
  return auth.handler(c.req.raw);
});

console.log("[SERVER] ✓ Auth routes registered at /auth/*");

app.route("/", sessionsRouter);
app.route("/", reservationsRouter);
app.route("/", scannerRouter);

console.log("[SERVER] ✓ All routes registered");

console.log("[SERVER] Starting HTTP server...");

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(
      `[SERVER] ✓ Server is running on http://localhost:${info.port}`
    );
    console.log(`[SERVER] Environment: ${env.NODE_ENV}`);
    console.log(`[SERVER] Auth endpoints available at: /auth/*`);
  }
);
