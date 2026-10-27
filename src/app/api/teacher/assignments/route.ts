import { NextResponse, NextRequest } from "next/server";
import { getSession } from "../../../../lib/auth/session";
import { assignments, Assignment } from "../../../../app/api/tugas/store";
import pool from "../../../../lib/db";
import { z } from "zod";
import crypto from "crypto";

// Zod schema for validating a new assignment
const createAssignmentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  subject: z.string(),
  targetClass: z.string(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
});

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "teacher") {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  // Convert map values to an array
  const allAssignments = Array.from(assignments.values());

  // Filter assignments for the logged-in teacher
  const teacherAssignments = allAssignments.filter(
    (assignment) => assignment.teacherId === session.userId
  );

  // Sort by creation date, newest first
  teacherAssignments.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json(teacherAssignments);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const json = await request.json();
    const parseResult = createAssignmentSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input data.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { title, description, subject, targetClass, dueDate } = parseResult.data;

    const newAssignment: Assignment = {
      id: `asg-${crypto.randomBytes(4).toString("hex")}`,
      teacherId: session.userId,
      title,
      description,
      subject,
      className: targetClass,
      dueDate,
      createdAt: new Date().toISOString(),
      status: "Aktif", // Default status
      submissions: 0,
      totalStudents: 30, // Default value, should be calculated based on class
      priority: json.priority || "Medium",
    };

    assignments.set(newAssignment.id, newAssignment);

    // Persist to MySQL database
    let conn;
    try {
      conn = await pool.getConnection();
      const formattedDueDate = new Date(dueDate).toISOString().slice(0, 19).replace('T', ' ');
      await conn.query(
        `INSERT INTO assignments (id, teacher_id, title, description, subject, target_class, priority, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newAssignment.id,
          session.userId,
          title,
          description,
          subject,
          targetClass,
          json.priority || "Medium",
          formattedDueDate,
        ]
      );
    } catch (dbErr) {
      console.warn("Could not persist assignment to MySQL:", dbErr);
    } finally {
      if (conn) conn.release();
    }

    return NextResponse.json(
      {
        success: true,
        message: "Assignment created successfully",
        assignment: newAssignment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
