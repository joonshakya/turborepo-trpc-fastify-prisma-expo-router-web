import { createTransport } from "nodemailer";
import type { SendMailOptions } from "nodemailer";

import type { Context } from "./../context";

const generateOTP = async (
  ctx: Context,
  user: {
    id: string;
  },
) => {
  const otp = Math.floor(Math.random() * 90000 + 10000).toString();
  await ctx.prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      otp,
      lastOtpSent: new Date(),
    },
  });
  return otp;
};

const sendMail = async (emailConfig: SendMailOptions) => {
  // create reusable transporter object using the default SMTP transport
  const transporter = createTransport({
    host: "smtp.gmail.com",
    // port: 587,
    port: 465,
    secure: true, // true for 465, false for other ports
    service: "Gmail",
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  // send mail with defined transport object
  await transporter.sendMail({
    from: '"Example" <example@gmail.com>',
    ...emailConfig,
  });

  // console.log("Message sent: %s", info.messageId);
  // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
};

export async function sendForgotPasswordOTP(
  context: Context,
  user: {
    id: string;
    email: string;
    fullName: string;
  },
): Promise<boolean> {
  const otp = await generateOTP(context, user);
  const config = {
    to: user.email, // list of receivers
    subject: "Code for password reset - Example", // Subject line
    text: `Dear ${user.fullName}!\nPlease use OTP: ${otp} to change your password on Example.`,
    html: `<b>Dear ${user.fullName}!</b><br />Please use OTP: <b>${otp}</b> to change your password on Example.`,
  };
  await sendMail(config);
  return true;
}

export async function sendLoginOTP(
  ctx: Context,
  user: {
    id: string;
    email: string;
  },
): Promise<boolean> {
  const otp = await generateOTP(ctx, {
    id: user.id,
  });
  const config: SendMailOptions = {
    to: user.email, // list of receivers
    subject: "OTP for Example Login", // Subject line
    text: `Please use OTP: ${otp} to login to your Example account.\n`,
    html: `Please use OTP: <b>${otp}</b> to login to your Example account.<br />`,
  };
  await sendMail(config);
  return true;
}
