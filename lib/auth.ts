import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // ኢሜይልና ፓስዎርድ ለሰራተኞች ብቻ ነው፦ አካውንቱን የሚከፍተው አድሚኑ ነው (lib/telegram/staff.ts)፤ ማንም ራሱን መመዝገብ አይችልም።
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8, maxPasswordLength: 128 },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false, input: false },
      suspended: { type: "boolean", required: false, defaultValue: false, input: false },
      verifiedSeller: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  plugins: [nextCookies()],
});
