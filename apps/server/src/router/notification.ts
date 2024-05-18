import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { NotificationTypeChoice } from ".prisma/client";

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(NotificationTypeChoice).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.notification.findMany({
        where: {
          userId: ctx.user.id,
          type: input.type,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          body: true,
          dataId: true,
          dataType: true,
          read: true,
          type: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }),
});
