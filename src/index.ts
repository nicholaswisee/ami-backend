import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import { auth } from "./lib/auth";
import reservationsRouter from "./routes/reservations";
import scannerRouter from "./routes/scanner";
import sessionsRouter from "./routes/sessions";

const app = new Hono({
  strict: false,
});

app.use(
  "*",
  cors({
    origin: env.FRONTEND_URL || "http://localhost:4141",
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api", sessionsRouter);
app.route("/api", reservationsRouter);
app.route("/api", scannerRouter);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
