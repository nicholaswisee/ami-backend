import { APIError } from "better-call";
import type { MiddlewareHandler } from "hono";
import { auth } from "@/lib/auth";

export type SessionData = Awaited<ReturnType<typeof auth.api.getSession>>;

export type AuthVariables = {
  authUserId: string;
  authSession: NonNullable<SessionData>;
};

export const requireAuth: MiddlewareHandler<{
  Variables: AuthVariables;
}> = async (c, next) => {
  try {
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!sessionData?.session || !sessionData.user) {
      return c.json({ error: "UNAUTHORIZED" }, 401);
    }

    c.set("authUserId", sessionData.user.id);
    c.set("authSession", sessionData);

    await next();
  } catch (error) {
    if (error instanceof APIError) {
      return c.json({ error: error.body?.code ?? "UNAUTHORIZED" }, 401);
    }
    throw error;
  }
};
