import { createTRPCRouter, publicProcedure } from "../trpc";

export const healthCheckRouter = createTRPCRouter({
  ping: publicProcedure.query(() => {
    return "pong";
  }),
});
