import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import { auth } from "./lib/auth";
import type { AuthType } from "./lib/auth";

const app = new Hono<{ Variables: AuthType }>({
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

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
