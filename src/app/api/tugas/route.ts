import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth/session";
import { assignments, submissions } from "./store";
import pool from "../../../lib/db";

// API endpoint for students to get all available assignments
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let connection;
    try {
      connection = await pool.getConnection();
      const [dbAssignments]: [any[], any] = await connection.query(
        "SELECT * FROM assignments ORDER BY due_date ASC"
      );
      if (dbAssignments && dbAssignments.length > 0) {
        dbAssignments.forEach((a: any) => {
          if (!assignments.has(a.id)) {
            assignments.set(a.id, {
              id: a.id,
              teacherId: a.teacher_id || "2",
              title: a.title,
              description: a.description || "",
              subject: a.subject || "Umum",
              className: a.target_class || "Semua Kelas",
              dueDate: a.due_date ? new Date(a.due_date).toISOString() : new Date().toISOString(),
              createdAt: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
              status: "Aktif",
              priority: a.priority || "Medium",
              submissions: 0,
              totalStudents: 30,
            });
          }
        });
      }
    } catch (dbErr) {
      console.warn("Could not sync assignments from MySQL, using store:", dbErr);
    } finally {
      if (connection) connection.release();
    }

    const allAssignments = Array.from(assignments.values());
    const allSubmissions = Array.from(submissions.values());

    // Map assignments and include submission status for the current user
    const assignmentsWithStatus = allAssignments.map((asm) => {
      const submission = allSubmissions.find(
        (sub) => sub.taskId === asm.id && sub.userId === session.userId
      );
      return {
        ...asm,
        status: submission
          ? submission.grade !== null
            ? "graded"
            : "submitted"
          : "pending",
        grade: submission?.grade || null,
      };
    });

    return NextResponse.json(assignmentsWithStatus);
  } catch (err) {
    console.error("Error fetching assignments:", err);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}
