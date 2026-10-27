import "server-only";
import { jwtVerify } from "jose";

export async function verifyJwtToken(token: string) {
  const secretKey = process.env.JWT_SECRET_KEY;
  if (!secretKey) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secretKey), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}
