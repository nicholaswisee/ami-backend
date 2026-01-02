import type { MiddlewareHandler } from "hono";
import { getAuthUser, type AuthUser } from "@hono/auth-js";

export type AuthVariables = {
  authUserId: string;
  authSession: AuthUser;
};

export const requireAuth: MiddlewareHandler<{
  Variables: AuthVariables;
}> = async (c, next) => {
  const authUser = await getAuthUser(c);
  if (!authUser?.user?.id) {
    return c.json({ error: "UNAUTHORIZED" }, 401);
  }

  c.set("authUserId", authUser.user.id);
  c.set("authSession", authUser);

  await next();
};
