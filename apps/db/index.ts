import { PrismaClient } from "@prisma/client";

import { sendPushNotification } from "./notification";
import { Notification } from ".prisma/client";

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    // log:
    // process.env.NODE_ENV === "development"
    //   ? ["query", "error", "warn"]
    //   : ["error"],
  });

// prisma.$extends({
//   name: "notification",
//   query: {
//     notification: {
//       async create({ model, operation, args, query }) {
//         const user = await prisma.user.findUniqueOrThrow({
//           where: {
//             id: args.data.userId,
//           },
//         });

//         console.log("notification");

//         if (!user.disabledNotifications.includes(args.data.type)) {
//           await sendPushNotification(user, {
//             body: args.data.body,
//             title: args.data.title,
//           });
//         }

//         return query(args);
//       },
//     },
//   },
// });

prisma.$use(async (params, next) => {
  const notification: Notification = await next(params);
  if (params.model !== "Notification") {
    return notification;
  }
  if (params.action === "create") {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: notification.userId,
      },
    });

    if (user.disabledNotifications.includes(notification.type)) {
      return notification;
    }

    await sendPushNotification(user, {
      body: notification.body,
      title: notification.title,
    });

    return notification;
  }
  return notification;
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
