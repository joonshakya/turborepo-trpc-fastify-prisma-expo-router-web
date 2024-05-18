import { EventEmitter } from "stream";
import { observable } from "@trpc/server/observable";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { UserTypeChoice } from ".prisma/client";

enum ChatEvent {
  MESSAGE = "MESSAGE",
}

const eventEmitter = new EventEmitter();

interface Message {
  id: string;
  chatId: string;
  text: string;
  createdAt: Date;
  sender: {
    id: string;
    fullName: string;
    avatar: string;
  };
}

const messageData = {
  orderBy: {
    createdAt: "desc" as const,
  },
  select: {
    id: true,
    chatId: true,
    createdAt: true,
    text: true,
    sender: {
      select: {
        id: true,
        fullName: true,
        avatar: true,
      },
    },
  },
};

const chatData = {
  id: true,
  closed: true,
  messages: {
    orderBy: {
      ...messageData.orderBy,
    },
    select: {
      ...messageData.select,
    },
  },
};
const chatListData = (userId: string) => ({
  id: true,
  closed: true,
  read: true,
  createdAt: true,
  participants: {
    select: {
      id: true,
      fullName: true,
      avatar: true,
    },
    where: {
      id: {
        not: {
          equals: userId,
        },
      },
    },
  },
  messages: {
    take: 1,
    orderBy: {
      ...messageData.orderBy,
    },
    select: {
      ...messageData.select,
    },
  },
});

export const chatRouter = createTRPCRouter({
  create: protectedProcedure.mutation(async ({ ctx }) => {
    const admins = await ctx.prisma.user.findMany({
      where: {
        type: UserTypeChoice.ADMIN,
      },
    });
    const chat = await ctx.prisma.chat.create({
      data: {
        participants: {
          connect: [
            {
              id: ctx.user.id,
            },
            ...admins.map((admin) => ({
              id: admin.id,
            })),
          ],
        },
      },
    });
    return chat;
  }),
  list: protectedProcedure.query(async ({ ctx }) => {
    const chatList = await ctx.prisma.chat.findMany({
      where: {
        participants: {
          some: {
            id: ctx.user.id,
          },
        },
        closed: false,
      },
      select: {
        ...chatListData(ctx.user.id),
      },
    });
    return chatList.sort((a, b) => {
      const aLastMessage = a.messages[0];
      const bLastMessage = b.messages[0];
      if (!aLastMessage) {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
      if (!bLastMessage) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return (
        bLastMessage.createdAt.getTime() - aLastMessage.createdAt.getTime()
      );
    });
  }),
  get: protectedProcedure
    .input(
      z.object({
        chatId: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let chat = await ctx.prisma.chat.findFirst({
        where: {
          id: input.chatId || "",
        },
        select: chatData,
      });
      if (ctx.user.type !== UserTypeChoice.ADMIN) {
        chat = await ctx.prisma.chat.findFirst({
          where: {
            participants: {
              some: {
                id: ctx.user.id,
              },
            },
            closed: false,
          },
          select: chatData,
        });
      }
      if (chat) {
        await ctx.prisma.chat.update({
          where: {
            id: chat.id,
          },
          data: {
            read: true,
          },
        });
      }
      return chat;
    }),
  sendMessage: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        chatId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.prisma.message.create({
        data: {
          text: input.message,
          sender: {
            connect: {
              id: ctx.user.id,
            },
          },
          chat: {
            connect: {
              id: input.chatId,
            },
          },
        },
        select: {
          ...messageData.select,
        },
      });
      if (ctx.user.type !== UserTypeChoice.ADMIN) {
        await ctx.prisma.chat.update({
          where: {
            id: input.chatId,
          },
          data: {
            read: false,
          },
        });
      }
      eventEmitter.emit(ChatEvent.MESSAGE, message);
      return true;
    }),
  listenToMessage: publicProcedure
    .input(
      z.object({
        chatId: z.string().nullish(),
      }),
    )
    .subscription(({ input }) => {
      return observable<Message>((emit) => {
        const listener = (message: Message) => {
          if (input.chatId && message.chatId !== input.chatId) {
            return;
          }
          emit.next(message);
        };
        eventEmitter.on(ChatEvent.MESSAGE, listener);
        return () => {
          eventEmitter.off(ChatEvent.MESSAGE, listener);
        };
      });
    }),
});
