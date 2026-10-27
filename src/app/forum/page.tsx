import { cookies } from "next/headers";
import { verifyJwtToken } from "../../lib/auth/jwt";
import ForumClientUI from "../components/forum/ForumClientUI";
import pool from "../../lib/db";

type Room = {
  id: string;
  name: string;
  subject?: string;
  classId?: string;
  callId: string;
  participants?: number;
  isActive?: boolean;
};

import { UserSession } from "../../../src/app/types/attendance";

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies(); // ⬅ pakai await di sini
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  try {
    const session = await verifyJwtToken(token);
    return session as UserSession;
  } catch (error) {
    console.error("Invalid or expired token:", error);
    return null;
  }
}

export default async function ForumHomePage() {
  const session = await getSession();

  // Fetch rooms from DB
  let roomsToShow: Room[] = [];
  try {
    const [rows]: [any[], any] = await pool.query("SELECT * FROM forum_rooms WHERE is_active = TRUE");
    roomsToShow = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      subject: row.subject,
      classId: row.class_id,
      callId: row.call_id,
      participants: row.participants,
      isActive: Boolean(row.is_active)
    }));
  } catch (error) {
    console.error("Failed to fetch forum rooms:", error);
    // Fallback to empty or error state handling logic if needed
  }

  const totalParticipants = roomsToShow.reduce(
    (sum, room) => sum + (room.participants || 0),
    0
  );
  const activeMeetings = roomsToShow.filter((room) => room.isActive).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent mb-10">
            💬 Forum Diskusi
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Pilih ruang diskusi sesuai mata pelajaran atau bergabung di forum
            umum untuk berdiskusi dan video meeting.
          </p>
        </div>

        <ForumClientUI initialRooms={roomsToShow} session={session} />

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/50 p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {roomsToShow.length}
            </div>
            <div className="text-gray-600 dark:text-gray-400 font-medium">
              Total Forum Tersedia
            </div>
          </div>
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/50 p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {totalParticipants.toLocaleString()}
            </div>
            <div className="text-gray-600 dark:text-gray-400 font-medium">
              Peserta Online
            </div>
          </div>
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/50 p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {activeMeetings}
            </div>
            <div className="text-gray-600 dark:text-gray-400 font-medium">
              Meeting Berlangsung
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
