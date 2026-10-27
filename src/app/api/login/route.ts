import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import pool from "../../../lib/db";
import { verifyPassword } from "../../../lib/auth/password";

export async function POST(request: NextRequest) {
  let connection;
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email dan password harus diisi" },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // 1. Find User
    const [userRows]: [any[], any] = await connection.query(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );

    if (userRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Email atau password salah" },
        { status: 401 }
      );
    }

    const user = userRows[0];

    // Secure password verification (supports scrypt and legacy passwords)
    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        { success: false, message: "Email atau password salah" },
        { status: 401 }
      );
    }

    // 2. Find School Details
    let school = null;
    if (user.school_id) {
      try {
        const [schoolRows]: [any[], any] = await connection.query(
          `SELECT * FROM schools WHERE id = ?`,
          [user.school_id]
        );
        if (schoolRows.length > 0) school = schoolRows[0];
      } catch (err) {
        console.warn("Could not fetch school details:", err);
      }
    }

    // 3. Find Student Details (if applicable)
    let grade: number | null = null;
    let studentId: string | null = null;

    if (user.role === "student") {
      try {
        const [studentRows]: [any[], any] = await connection.query(
          `SELECT * FROM students WHERE user_id = ? OR id = ? LIMIT 1`,
          [user.id, user.id]
        );
        if (studentRows.length > 0) {
          const student = studentRows[0];
          studentId = student.id;
          if (student.class_name) {
            const match = student.class_name.match(/^(\d+)/);
            if (match) grade = parseInt(match[1], 10);
          }
        }
      } catch (err) {
        console.warn("Could not fetch student details:", err);
      }
    }

    // 4. Create Sanitized User Profile (Do not leak password hash to client)
    const { password: _pw, ...safeUser } = user;
    const userProfile = {
      ...safeUser,
      schoolId: user.school_id,
      school: school,
      grade: grade,
      studentId: studentId,
    };

    const secret = process.env.JWT_SECRET_KEY;
    if (!secret) {
      console.error("JWT_SECRET_KEY is not set in environment variables.");
      return NextResponse.json(
        { success: false, message: "Konfigurasi server tidak lengkap." },
        { status: 500 }
      );
    }

    const payload: { [key: string]: any } = {
      id: user.id,
      userId: user.id,
      role: user.role,
      name: user.name,
      school: school,
      schoolId: user.school_id,
      grade: grade,
      studentId: studentId,
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(secret));

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: userProfile,
    });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
