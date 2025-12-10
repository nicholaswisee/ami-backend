import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { env } from "./env";
import type { AuthType } from "./lib/auth";
import auth from "@/routes/auth";

const app = new Hono<{ Variables: AuthType }>({
  strict: false,
});

const routes = [auth] as const;

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

routes.forEach((route) => {
  app.basePath("/api").route("/", route);
});

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
