import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth/session";

let threads: any[] = [
  {
    id: "1",
    name: "Diskusi Matematika Kelas 10 IPA 1",
    subject: "Matematika",
    classId: "10-IPA-1",
    author: "Guru Matematika",
    authorId: "2",
    createdAt: "2025-09-11T08:00:00Z",
    zoomLink: "https://zoom.us/j/1111111111",
  },
  {
    id: "2",
    name: "Forum Umum Semua Mata Pelajaran",
    author: "Admin",
    authorId: "3",
    createdAt: "2025-09-11T08:00:00Z",
    zoomLink: "https://zoom.us/j/generalforum",
  },
];

// GET /api/forum/threads
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(threads);
}

// POST /api/forum/threads
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    if (!data.name || !data.subject) {
      return NextResponse.json(
        { success: false, message: "Nama forum dan mata pelajaran wajib diisi" },
        { status: 400 }
      );
    }

    const newThread = {
      ...data,
      id: String(Date.now()),
      author: session.name || "User",
      authorId: session.userId || session.id,
      createdAt: new Date().toISOString(),
    };
    threads.unshift(newThread);
    return NextResponse.json(newThread, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
