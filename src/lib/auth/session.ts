import "server-only"; // Ensures this code only runs on the server

import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export interface UserSession {
  id: string;
  userId: string;
  role: "student" | "teacher" | "admin_sekolah" | "admin_langganan" | "kepala_sekolah" | "headmaster";
  name: string;
  schoolId?: string;
  school?: any;
  grade?: number | null;
  studentId?: string | null;
  iat: number;
  exp: number;
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) {
    console.error("JWT_SECRET_KEY is not set in environment variables.");
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ["HS256"],
      }
    );

    const data = payload as any;
    const resolvedId = data.id || data.userId || "";
    const resolvedUserId = data.userId || data.id || "";

    return {
      ...data,
      id: resolvedId,
      userId: resolvedUserId,
    } as UserSession;
  } catch (error) {
    console.error("JWT Verification failed:", error);
    return null;
  }
}

export async function getJwtToken(): Promise<string | undefined> {
  return (await cookies()).get("auth_token")?.value;
}
