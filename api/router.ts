import { authRouter } from "./auth-router";
import { milkRouter } from "./milkRouter";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  milk: milkRouter,
});

export type AppRouter = typeof appRouter;
