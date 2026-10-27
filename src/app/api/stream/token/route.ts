// app/api/stream/token/route.ts - Updated version
import { NextRequest, NextResponse } from "next/server";
import { StreamClient } from "@stream-io/node-sdk";
import { getSession } from "../../../../lib/auth/session";

// ✅ Handle POST method (yang digunakan VideoManager)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // 1. Check for authenticated user
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. No active session." },
        { status: 401 }
      );
    }

    // Strictly derive user from verified session to prevent impersonation
    const userId = session.userId || session.id;

    try {
      const body = await request.json();
      if (body.userId && body.userId !== userId && session.role !== "admin_langganan") {
        return NextResponse.json(
          { error: "Forbidden: Cannot request video token for another user" },
          { status: 403 }
        );
      }
    } catch {
      // Body is optional; continue with session userId
    }

    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
    const secret = process.env.STREAM_SECRET_KEY;

    if (!apiKey || !secret) {
      console.error("Stream configuration missing in environment variables.");
      return NextResponse.json(
        { error: "Stream configuration is missing on the server." },
        { status: 500 }
      );
    }

    // Initialize Stream client on the server
    const serverClient = new StreamClient(apiKey, secret);

    // 2. Generate token for the user from the secure session
    const token = serverClient.createToken(userId);

    console.log(`✅ Token generated successfully for user: ${userId}`);
    return NextResponse.json({
      token,
      userId,
      apiKey, // ✅ Also return apiKey for client initialization
    });
  } catch (error) {
    console.error("💥 Error generating Stream token:", error);
    return NextResponse.json(
      {
        error:
          "Failed to generate token: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}

// ✅ Keep existing GET method for backward compatibility
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    // 1. Check for authenticated user
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. No active session." },
        { status: 401 }
      );
    }

    const userId = session.userId;

    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
    const secret = process.env.STREAM_SECRET_KEY;

    if (!apiKey || !secret) {
      console.error("Stream configuration missing in environment variables.");
      return NextResponse.json(
        { error: "Stream configuration is missing on the server." },
        { status: 500 }
      );
    }

    // Initialize Stream client on the server
    const serverClient = new StreamClient(apiKey, secret);

    // 2. Generate token for the user from the secure session
    const token = serverClient.createToken(userId);

    console.log(`✅ Token generated successfully for user: ${userId}`);
    return NextResponse.json({
      token,
      userId,
      apiKey,
    });
  } catch (error) {
    console.error("💥 Error generating Stream token:", error);
    return NextResponse.json(
      {
        error:
          "Failed to generate token: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}
