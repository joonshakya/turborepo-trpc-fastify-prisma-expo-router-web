import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";
import { z } from "zod";

// import type { Authedctx, ctx } from "../ctx";
import { signJwt } from "../jwt";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { sendForgotPasswordOTP, sendLoginOTP } from "../utils/mail";
import validatePassword from "../utils/validatePassword";
import {
  DayChoice,
  DeliveryRecurrenceChoice,
  NotificationDataTypeChoice,
  NotificationTypeChoice,
  Prisma,
  UserTypeChoice,
} from ".prisma/client";

// import { User } from ".prisma/client";

const loginData = {
  id: true,
  avatar: true,
  disabledNotifications: true,
  email: true,
  type: true,
  emailVerified: true,
  fullName: true,
  subscription: {
    select: {
      id: true,
      name: true,
      dietary: true,
    },
  },
  deliveriesLeft: true,
  subscriptionTotalDeliveries: true,
  _count: {
    select: {
      notifications: true,
    },
  },
  about: true,
};

export const userRouter = createTRPCRouter({
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }
    return ctx.prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.user.id,
      },
      select: loginData,
    });
  }),
  sendOTPForLogin: publicProcedure
    .input(
      z.object({
        email: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const e = "Invalid email or password";

      const user = await ctx.prisma.user.findUnique({
        where: {
          email: input.email,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: e,
        });
      }
      const passwordIsValid = await bcrypt.compare(
        input.password,
        user.password,
      );
      if (!passwordIsValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e,
        });
      }

      if (user.noOfPasswordsChanged === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Reset your password before logging in with OTP",
        });
      }

      if (
        user.lastOtpSent &&
        new Date().getTime() - new Date(user.lastOtpSent).getTime() < 60000
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please wait a minute before requesting another OTP",
        });
      }

      void sendLoginOTP(ctx, user);
      return true;
    }),
  login: publicProcedure
    .input(
      z.object({
        email: z.string(),
        password: z.string(),
        otp: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const e = "Invalid email or password";
      const user = await ctx.prisma.user.findUnique({
        where: {
          email: input.email,
        },
        select: {
          ...loginData,

          // just for logic
          noOfPasswordsChanged: true,
          password: true,
          otp: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: e,
        });
      }
      const { noOfPasswordsChanged, password, otp, ...returnUser } = user;

      const passwordIsValid = await bcrypt.compare(input.password, password);

      if (!passwordIsValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e,
        });
      }

      if (otp != input.otp) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid OTP",
        });
      }

      const token = signJwt({ id: user.id, noOfPasswordsChanged });

      return {
        user: returnUser,
        token,
      };
    }),
  sendOTPForForgotPassword: publicProcedure
    .input(
      z.object({
        email: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: {
          email: input.email,
        },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user with this email was found",
        });
      }

      if (
        user.lastOtpSent &&
        new Date().getTime() - new Date(user.lastOtpSent).getTime() < 60000
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please wait a minute before requesting another OTP",
        });
      }

      void sendForgotPasswordOTP(ctx, user);
      return true;
    }),
  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string(),
        otp: z.string(),
        password: z.string(),
        confirmPassword: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: {
          email: input.email,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user with this email was found",
        });
      }

      if (input.password != input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      const passwordError = validatePassword(input.password);
      if (passwordError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordError,
        });
      }

      if (user.otp != input.otp) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid OTP",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hash = bcrypt.hashSync(input.password, salt);

      const { noOfPasswordsChanged, ...returnUser } =
        await ctx.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            password: hash,
            noOfPasswordsChanged: {
              increment: 1,
            },
          },
          select: {
            ...loginData,
            // for logic
            noOfPasswordsChanged: true,
          },
        });

      const token = signJwt({ id: user.id, noOfPasswordsChanged });

      // return the jwt
      return { user: returnUser, token };
    }),
  create: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        fullName: z.string(),
        email: z.string(),
        password: z.string().optional(),
        confirmPassword: z.string().optional(),
        phone: z.string(),
        secondaryPhone: z.string().nullish(),
        type: z.nativeEnum(UserTypeChoice),
        about: z.string().nullish(),
        avatar: z.string().nullish(),
        locationName: z.string(),
        latitude: z.number(),
        longitude: z.number(),

        deliveryRecurrence: z.nativeEnum(DeliveryRecurrenceChoice).nullish(),
        deliveryDateOfMonth: z.number().nullish(),
        deliveryDayOfWeek: z.nativeEnum(DayChoice).nullish(),
        deliveryDate: z.date().nullish(),
        subscriptionId: z.string().nullish(),
        subscriptionTotalDeliveries: z.number().nullish(),
        deliveriesLeft: z.number().nullish(),

        driverTruckNumber: z.string().nullish(),
        driverTruckDetails: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.type !== UserTypeChoice.ADMIN) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only admins can create users",
        });
      }
      if (input.type === UserTypeChoice.ADMIN) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create admin",
        });
      }
      if (input.type !== UserTypeChoice.CUSTOMER) {
        delete input.subscriptionId;
      }
      if (input.type === UserTypeChoice.DRIVER) {
        if (!input.driverTruckNumber || !input.driverTruckDetails) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please provide truck details",
          });
        }
      }
      if (input.type === UserTypeChoice.CUSTOMER) {
        if (!input.deliveryRecurrence)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please provide delivery recurrence",
          });
        if (input.deliveryRecurrence === DeliveryRecurrenceChoice.MONTHLY) {
          if (!input.deliveryDateOfMonth)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Please provide delivery date of month",
            });
        }
        if (input.deliveryRecurrence === DeliveryRecurrenceChoice.WEEKLY) {
          if (!input.deliveryDayOfWeek)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Please provide delivery day of week",
            });
        }
        if (input.deliveryRecurrence === DeliveryRecurrenceChoice.ONCE) {
          if (!input.deliveryDate)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Please provide delivery date",
            });
        }
        if (!input.subscriptionId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please provide subscription",
          });
        if (!input.subscriptionTotalDeliveries)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please provide number of deliveries",
          });
      }
      if (!input.userId) {
        if (!input.password || !input.confirmPassword) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Password is required",
          });
        }
        if (input.password !== input.confirmPassword) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Passwords do not match",
          });
        }
        const passwordError = validatePassword(input.password);
        if (passwordError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: passwordError,
          });
        }
        const salt = await bcrypt.genSalt(10);
        const hash = bcrypt.hashSync(input.password, salt);
        delete input.confirmPassword;

        const subscription = await ctx.prisma.subscription.findUnique({
          where: {
            id: input.subscriptionId || "",
          },
          include: {
            defaultProducts: true,
          },
        });
        try {
          await ctx.prisma.user.create({
            data: {
              ...input,
              deliveriesLeft: input.subscriptionTotalDeliveries ?? null,
              password: hash,
              basketProducts: subscription
                ? {
                    create: subscription.defaultProducts.map(
                      (defaultProduct) => ({
                        productId: defaultProduct.productId,
                      }),
                    ),
                  }
                : undefined,
              noOfPasswordsChanged: 0,
            },
            select: loginData,
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === "P2002") {
              const error =
                e.meta && Array.isArray(e.meta.target)
                  ? `A user with this ${e.meta.target[0]} already exists.`
                  : "A user must be unique.";
              console.log(e);
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: error,
              });
            } else {
              console.log(e);
              throw e;
            }
          }
          throw e;
        }
        return true;
      }
      const userId = input.userId;
      delete input.userId;
      delete input.confirmPassword;
      delete input.password;

      await ctx.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          ...input,
        },
        select: loginData,
      });
      return true;
    }),
  list: protectedProcedure
    .input(
      z.object({
        keyword: z.string().optional(),
        type: z.nativeEnum(UserTypeChoice).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (
        ![UserTypeChoice.ADMIN as UserTypeChoice].includes(ctx.user.type) &&
        (![UserTypeChoice.GENERAL_STAFF as UserTypeChoice].includes(
          ctx.user.type,
        ) ||
          input.type !== UserTypeChoice.CUSTOMER)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not allowed to access this resource",
        });
      }
      return ctx.prisma.user.findMany({
        where: {
          type: input.type,
          OR: [
            {
              fullName: {
                contains: input.keyword,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: input.keyword,
                mode: "insensitive",
              },
            },
            {
              phone: {
                contains: input.keyword,
                mode: "insensitive",
              },
            },
            {
              secondaryPhone: {
                contains: input.keyword,
                mode: "insensitive",
              },
            },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          avatar: true,
          fullName: true,
          type: true,
          phone: true,
        },
      });
    }),
  assignDriver: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        driverId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.type !== UserTypeChoice.ADMIN) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only admins can assign drivers",
        });
      }
      await ctx.prisma.user.update({
        where: {
          id: input.customerId,
        },
        data: {
          assignedDriver: {
            connect: {
              id: input.driverId,
            },
          },
        },
      });
      await ctx.prisma.notification.create({
        data: {
          userId: input.driverId,
          title: "New customer assigned",
          body: "You have been assigned a new customer",
          type: NotificationTypeChoice.CUSTOMER_ASSIGNED,
          dataId: input.customerId,
          dataType: NotificationDataTypeChoice.USER,
        },
      });
      return true;
    }),
  listUnassignedUsers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: {
        type: UserTypeChoice.CUSTOMER,
        assignedDriverId: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        avatar: true,
        fullName: true,
        type: true,
        phone: true,
      },
    });
  }),
  setNoificationId: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: {
          id: ctx.user!.id,
        },
        data: {
          notificationIds: [
            ...new Set([
              ...(ctx.user!.notificationIds || []),
              input.notificationId,
            ]),
          ],
        },
      });
      return true;
    }),
  removeNotificationId: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: {
          id: ctx.user!.id,
        },
        data: {
          notificationIds: ctx.user.notificationIds.filter(
            (id) => id !== input.notificationId,
          ),
        },
      });
      return true;
    }),
  getBasicInfo: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: {
          id: input.userId,
        },
        select: {
          assignedDriver: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              avatar: true,
            },
          },
          id: true,
          fullName: true,
          email: true,
          password: true,
          phone: true,
          secondaryPhone: true,
          type: true,
          about: true,
          avatar: true,
          locationName: true,
          latitude: true,
          longitude: true,
          deliveryRecurrence: true,
          deliveryDateOfMonth: true,
          deliveryDayOfWeek: true,
          deliveryDate: true,
          subscriptionId: true,
          subscriptionTotalDeliveries: true,
          deliveriesLeft: true,
          driverTruckNumber: true,
          driverTruckDetails: true,
        },
      });
    }),
});
