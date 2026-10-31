import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwtToken } from "../src/lib/auth/jwt";
import { isFeatureRestricted } from "../src/lib/auth/restrictions";
import type { UserRole, UserSession } from "../src/app/types/attendance";

// --- Path Definitions ---
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/api/login"];
const QA_PATHS = ["/qa", "/api/qa"];
const TEACHER_PATHS = ["/teacher", "/api/teacher"];
const ADMIN_LANGGANAN_PATHS = ["/admin/langganan", "/api/admin/langganan"];
const HEADMASTER_PATHS = ["/kepala", "/api/kepala"];
const SCHOOL_ADMIN_PATHS = ["/admin-sekolah", "/api/admin-sekolah"];
const STUDENT_PATHS = [
  "/verifikasi-login",
  "/dashboard",
  "/attendance",
  "/forum",
  "/jadwal",
  "/matapelajaran",
  "/nilai",
  "/tugas",
  "/tryout", // Add tryout to student paths
];
// Paths accessible to students from outside Jawa Barat
const LIMITED_ACCESS_PATHS = [
  "/jadwal",
  "/tugas",
  "/dashboard",
  "/api/jadwal",
  "/api/tugas",
];

async function getSessionFromToken(
  request: NextRequest
): Promise<UserSession | null> {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return null;

  try {
    const verifiedToken = await verifyJwtToken(token);
    if (!verifiedToken) return null;
    // Ensure the payload conforms to our UserSession type
    return verifiedToken as UserSession;
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionFromToken(request);
  const isAuthenticated = session !== null;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isTeacherPath = TEACHER_PATHS.some((path) => pathname.startsWith(path));
  const isAdminLanggananPath = ADMIN_LANGGANAN_PATHS.some((path) =>
    pathname.startsWith(path)
  );
  const isHeadmasterPath = HEADMASTER_PATHS.some((path) =>
    pathname.startsWith(path)
  );
  const isSchoolAdminPath = SCHOOL_ADMIN_PATHS.some((path) =>
    pathname.startsWith(path)
  );
  const isStudentPath = STUDENT_PATHS.some((path) => pathname.startsWith(path));

  // --- Main redirect logic for authenticated users ---
  if (isAuthenticated) {
    // 1. Redirect logged-in users away from public pages
    if (isPublicPath) {
      let redirectUrl = "/dashboard"; // Default for students
      if (session.role === "teacher") redirectUrl = "/teacher/dashboard";
      if (session.role === "admin_langganan") redirectUrl = "/admin/langganan";
      if (session.role === "kepala_sekolah") redirectUrl = "/kepala/dashboard";
      if (session.role === "admin_sekolah")
        redirectUrl = "/admin-sekolah/dashboard";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // 2. Role-based path protection
    // Block students/admins from teacher paths, but allow admin_langganan
    if (isTeacherPath && session.role !== "teacher" && session.role !== "admin_langganan") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Block everyone except admin_langganan from their dedicated path
    if (isAdminLanggananPath && session.role !== "admin_langganan") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Block students/others from kepala paths, but allow admin_langganan
    if (isHeadmasterPath && session.role !== "kepala_sekolah" && session.role !== "admin_langganan") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Block non-school-admins from admin-sekolah paths, but allow admin_langganan
    if (isSchoolAdminPath && session.role !== "admin_sekolah" && session.role !== "admin_langganan") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Block teachers/admins from student paths
    if (isStudentPath && session.role !== "student") {
      const redirectUrl =
        session.role === "teacher"
          ? "/teacher/dashboard"
          : session.role === "kepala_sekolah"
            ? "/kepala/dashboard"
            : session.role === "admin_sekolah"
              ? "/admin-sekolah/dashboard"
              : "/admin/langganan";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // 4. Location-based feature restriction (HIGHER PRIORITY)
    if (
      session.role &&
      session.school?.province &&
      pathname !== "/notifikasi" && // Avoid redirect loop
      isFeatureRestricted(session.role, session.school.province, pathname)
    ) {
      return NextResponse.redirect(new URL("/notifikasi", request.url));
    }

    // 3. Grade-based feature restriction for "Tryout" page
    if (pathname.startsWith("/tryout") && session.role === "student") {
      if (session.grade !== undefined && ![10, 11, 12].includes(session.grade)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }
  else {
    // If an unauthenticated user tries to access any protected path:
    if (!isPublicPath && pathname !== "/" && !QA_PATHS.some((path) => pathname.startsWith(path))) {
      // For API routes, return 401 Unauthorized JSON instead of HTML redirect
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // --- Root path handling ---
  if (pathname === "/") {
    if (isAuthenticated) {
      let redirectUrl = "/dashboard"; // Default for students
      if (session.role === "teacher") redirectUrl = "/teacher/dashboard";
      if (session.role === "admin_langganan") redirectUrl = "/admin/langganan";
      if (session.role === "kepala_sekolah") redirectUrl = "/kepala/dashboard";
      if (session.role === "admin_sekolah")
        redirectUrl = "/admin-sekolah/dashboard";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Allow the request to proceed if no redirection rules matched.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except for static files, images, and the favicon.
    "/((?!_next/static|_next/image|favicon.ico|assets/|file.svg|globe.svg|next.svg|vercel.svg|window.svg).*)",
  ],
};
