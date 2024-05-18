import cors from "@fastify/cors";
import ws from "@fastify/websocket";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import fastify from "fastify";

import { createTRPCContext } from "./src/context";
import { appRouter } from "./src/router";
import type { AppRouter } from "./src/router";

export type { AppRouter } from "./src/router";

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const prefix = "/";
const server = fastify({ logger: false });

void server.register(ws);
void server.register(cors, {
  origin: "*",
});
void server.register(fastifyTRPCPlugin, {
  prefix,
  useWSS: true,
  trpcOptions: {
    router: appRouter,
    createContext: createTRPCContext,
  },
});

const start = async () => {
  try {
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`tRPC server running at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    if (err instanceof Error) {
      console.log(err.message);
    }
    process.exit(1);
  }
};

void start();
