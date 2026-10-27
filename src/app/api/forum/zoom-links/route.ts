import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth/session";

// Simpan Zoom link per forumnya (key: threadId atau "general")
let zoomLinks: Record<string, string> = {
  "1": "https://zoom.us/j/1111111111",
  general: "https://zoom.us/j/generalforum",
};

// GET /api/forum/zoom-links?threadId=1
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");
  return NextResponse.json({
    zoomLink: zoomLinks[threadId || "general"] || "",
  });
}

// POST /api/forum/zoom-links
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // Only teachers and admins may modify call links
  if (!["teacher", "admin_sekolah", "admin_langganan", "kepala_sekolah", "headmaster"].includes(session.role)) {
    return NextResponse.json({ success: false, message: "Forbidden: Hanya guru/admin yang dapat mengubah link video" }, { status: 403 });
  }

  try {
    const { threadId, zoomLink } = await req.json();
    if (!zoomLink) {
      return NextResponse.json({ success: false, message: "zoomLink wajib diisi" }, { status: 400 });
    }
    zoomLinks[threadId || "general"] = zoomLink;
    return NextResponse.json({ success: true, zoomLink });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
