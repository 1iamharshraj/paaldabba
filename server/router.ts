import { authRouter } from "./auth-router.js";
import { milkRouter } from "./milkRouter.js";
import { createRouter, publicQuery } from "./middleware.js";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  milk: milkRouter,
});

export type AppRouter = typeof appRouter;
