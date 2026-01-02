import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env";
import { auth } from "./lib/auth";
import reservationsRouter from "./routes/reservations";
import scannerRouter from "./routes/scanner";
import sessionsRouter from "./routes/sessions";

const app = new Hono({
  strict: false,
});

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return null;
      if (env.NODE_ENV !== "production") return origin;
      const FrontendUrls = (env.FRONTEND_URLS ?? "").split(",");
      const AllowedOrigins = new Set(
        FrontendUrls.map((u) => u.trim()).filter(Boolean)
      );
      return AllowedOrigins.has(origin) ? origin : null;
    },
    credentials: true,
  })
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.on(["POST", "GET"], "/auth/*", (c) => {
  console.log(`[AUTH] ${c.req.method} ${c.req.url}`);
  return auth.handler(c.req.raw);
});
app.route("/", sessionsRouter);
app.route("/", reservationsRouter);
app.route("/", scannerRouter);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
