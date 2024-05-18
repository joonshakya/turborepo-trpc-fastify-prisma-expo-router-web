import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { chatRouter } from "./chat";
import { healthCheckRouter } from "./healthCheck";
import { notificationRouter } from "./notification";
import { s3Router } from "./s3";
import { userRouter } from "./user";
import { UserTypeChoice } from ".prisma/client";

export const appRouter = createTRPCRouter({
  user: userRouter,
  chat: chatRouter,
  s3: s3Router,
  notification: notificationRouter,
  healthCheck: healthCheckRouter,
});

export type AppRouter = typeof appRouter;
