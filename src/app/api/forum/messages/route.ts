import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth/session";

let messages: any[] = [
  {
    id: "1001",
    threadId: "1",
    author: "Andi Siswa",
    authorId: "s1",
    content: "Bagaimana cara cepat menghitung determinan?",
    createdAt: "2025-09-11T08:05:00Z",
  },
];

// GET /api/forum/messages?threadId=1
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");
  const filtered = messages.filter((m) => m.threadId === threadId);
  return NextResponse.json(filtered);
}

// POST /api/forum/messages
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    if (!data.content || !data.threadId) {
      return NextResponse.json(
        { success: false, message: "content dan threadId wajib diisi" },
        { status: 400 }
      );
    }

    const newMessage = {
      ...data,
      id: String(Date.now()),
      author: session.name || "User",
      authorId: session.userId || session.id,
      createdAt: new Date().toISOString(),
    };
    messages.push(newMessage);
    return NextResponse.json(newMessage, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
