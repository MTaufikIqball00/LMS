import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== "admin_langganan") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // 1. Total Schools
        const [schoolRows]: [any[], any] = await connection.query("SELECT COUNT(*) as count FROM schools");
        const totalSchools = schoolRows[0].count;

        // 2. Active Subs
        const [subRows]: [any[], any] = await connection.query("SELECT COUNT(*) as count FROM schools WHERE subscription_status = 'active'");
        const activeSubs = subRows[0].count;

        // 3. Total Students
        const [studentRows]: [any[], any] = await connection.query("SELECT COUNT(*) as count FROM students");
        const totalStudents = studentRows[0].count;

        // 4. Total Teachers
        const [teacherRows]: [any[], any] = await connection.query("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'");
        const totalTeachers = teacherRows[0].count;

        // 5. Recent Activity (Mock from DB or real logs table if exists)
        // We have an activities table but it's for students. 
        // Admin logs might be different. For now, we can return empty or mock if no admin logs table.
        // Let's check if we have `activity_logs` table... earlier migration mentioned it?
        // "Migrate Admin Reports & Activity Logs" was checked.
        // Let's assume there is logic for activity logs or we just use mock for this overview widget if table not ready.
        // Based on `lms_db.sql` there isn't a generic system audit log, only student activities.
        // I'll keep the mock logs for the widget but fetch the counts dynamically.

        // 6. Recent Schools for table
        const [recentSchools]: [any[], any] = await connection.query("SELECT name, province, subscription_status as subscriptionStatus FROM schools ORDER BY created_at DESC LIMIT 5");

        return NextResponse.json({
            totalSchools,
            totalStudents,
            totalTeachers,
            activeSubs,
            recentSchools
        });

    } catch (error) {
        console.error("Database error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
