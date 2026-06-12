import jwt from "jsonwebtoken";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { db } from "./db.server";

export type JwtPayload = { userId: string; role: string; username: string };

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("SERVER_MISCONFIGURED");
  return secret;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export function setAuthCookie(token: string) {
  setCookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export function clearAuthCookie() {
  deleteCookie("auth_token", { path: "/" });
}

// Call this inside any server function that requires authentication.
// Throws a descriptive error if the user is not logged in or token is invalid.
export async function requireAuth() {
  const token = getCookie("auth_token");
  if (!token) throw new Error("UNAUTHENTICATED");
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new Error("UNAUTHENTICATED");
  }
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}

// Like requireAuth but also checks the user's role.
export async function requireRole(role: "LEARNER" | "CREATOR" | "ADVERTISER") {
  const user = await requireAuth();
  if (user.role !== role) throw new Error("FORBIDDEN");
  return user;
}
