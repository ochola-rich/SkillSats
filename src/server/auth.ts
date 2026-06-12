import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from "../lib/auth";

// --- REGISTER ---
export const registerUser = createServerFn({ method: "POST" })
  .validator(
    (data: {
      email: string;
      username: string;
      password: string;
      role: "LEARNER" | "CREATOR" | "ADVERTISER";
    }) => data,
  )
  .handler(
    async ({
      data,
    }: {
      data: {
        email: string;
        username: string;
        password: string;
        role: "LEARNER" | "CREATOR" | "ADVERTISER";
      };
    }) => {
      const existing = await db.user.findFirst({
        where: { OR: [{ email: data.email }, { username: data.username }] },
      });
      if (existing) throw new Error("EMAIL_OR_USERNAME_TAKEN");

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await db.user.create({
        data: {
          email: data.email,
          username: data.username,
          password: hashedPassword,
          role: data.role,
        },
      });

      const token = signToken({ userId: user.id, role: user.role, username: user.username });
      setAuthCookie(token);
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        balanceSats: user.balanceSats,
      };
    },
  );

// --- LOGIN ---
export const loginUser = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }: { data: { email: string; password: string } }) => {
    const user = await db.user.findUnique({ where: { email: data.email } });
    if (!user) throw new Error("INVALID_CREDENTIALS");

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) throw new Error("INVALID_CREDENTIALS");

    const token = signToken({ userId: user.id, role: user.role, username: user.username });
    setAuthCookie(token);
    return { id: user.id, username: user.username, role: user.role, balanceSats: user.balanceSats };
  });

// --- LOGOUT ---
export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  clearAuthCookie();
  return { success: true };
});

// --- GET ME (fetch current user profile + balance) ---
export const getMe = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireAuth();
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    balanceSats: user.balanceSats,
  };
});
