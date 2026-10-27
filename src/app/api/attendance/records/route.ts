import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth/session";
import pool from "../../../../lib/db";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    let query = `
      SELECT 
        a.id, a.student_id as studentId, COALESCE(s.name, u.name, 'Siswa') as studentName,
        a.subject, a.date, a.check_in_time as checkInTime, a.status,
        a.location_lat, a.location_lng, a.location_address as locationAddress,
        a.notes, a.semester
      FROM attendance a
      LEFT JOIN students s ON a.student_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
    `;
    const params: any[] = [];

    // If student, filter strictly for their own records
    if (session.role === "student") {
      query += ` WHERE a.student_id = ? OR s.user_id = ? `;
      params.push(session.studentId || session.userId || session.id, session.id);
    }

    query += ` ORDER BY a.date DESC LIMIT 50 `;

    const [rows]: [any[], any] = await connection.query(query, params);

    if (rows && rows.length > 0) {
      const formatted = rows.map((r: any) => ({
        id: String(r.id),
        studentId: r.studentId,
        studentName: r.studentName,
        subject: r.subject || "Umum",
        teacher: "Guru Pengampu",
        date: r.date ? new Date(r.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        checkInTime: r.checkInTime ? String(r.checkInTime) : null,
        status: r.status,
        location: {
          latitude: Number(r.location_lat) || -6.2,
          longitude: Number(r.location_lng) || 106.8,
        },
        notes: r.notes || "Hadir",
        semester: r.semester || "Ganjil 2024",
      }));
      return NextResponse.json(formatted);
    }

    // Fallback if DB table has no rows
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records" },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
