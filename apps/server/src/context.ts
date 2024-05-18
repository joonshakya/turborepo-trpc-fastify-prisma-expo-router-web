import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";

import { prisma } from "../../db";
import { verifyJwt } from "./jwt";
import type { User } from ".prisma/client";

export interface Context {
  user: User | null;
  prisma: typeof prisma;
}

export interface AuthedContext {
  user: User;
  prisma: typeof prisma;
}

export const createTRPCContext = async ({
  req,
}: CreateFastifyContextOptions): Promise<Context> => {
  // add 500 mn delay
  // await new Promise((resolve) => setTimeout(resolve, 500));

  const authHeader = req.headers.authorization;
  let contextUser: User | null = null;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    if (!token) {
      return {
        user: null,
        prisma,
      };
    }
    const { id, noOfPasswordsChanged } =
      verifyJwt<{ id: string; noOfPasswordsChanged: number }>(token) || {};
    if (id) {
      const user = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (user && user.noOfPasswordsChanged === noOfPasswordsChanged) {
        contextUser = user;
      }
    }
  }

  return {
    user: contextUser,
    prisma,
  };
};
