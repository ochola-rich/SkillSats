import { z } from "zod";

export const roleSchema = z.enum(["LEARNER", "CREATOR", "ADVERTISER"]);

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  password: z.string().min(8).max(72),
  role: roleSchema,
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72),
});

export const videoIdSchema = z.object({
  videoId: z.string().uuid(),
});

export const createVideoSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(2_000),
    url: z.string().trim().min(1).max(2_048),
    priceSats: z.number().int().nonnegative(),
    isFree: z.boolean(),
    courseId: z.string().trim().min(3).max(100),
  })
  .refine((data) => data.isFree || data.priceSats > 0, {
    message: "Paid videos must cost at least one sat",
    path: ["priceSats"],
  });

export const invoiceStatusSchema = z.object({
  rHash: z.string().regex(/^[a-fA-F0-9]{64}$/, "Invalid payment hash"),
});

export const createAdSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    videoUrl: z.string().trim().min(1).max(2_048),
    budgetSats: z.number().int().positive(),
    rewardSats: z.number().int().positive(),
  })
  .refine((data) => data.rewardSats <= data.budgetSats, {
    message: "Reward cannot exceed the campaign budget",
    path: ["rewardSats"],
  });

export const adIdSchema = z.object({
  adId: z.string().uuid(),
});

export const withdrawSchema = z.object({
  payment_request: z.string().trim().min(20).max(5_000),
  amount_sats: z.number().int().positive(),
});
