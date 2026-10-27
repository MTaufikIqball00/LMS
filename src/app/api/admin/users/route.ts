import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth/session";
import pool from "../../../../lib/db";
import { hashPassword } from "../../../../lib/auth/password";

export async function GET(request: NextRequest) {
    const session = await getSession();

    // Verify Admin Access
    if (!session || !['admin_langganan', 'admin_sekolah'].includes(session.role)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        let query = `
            SELECT u.*, s.name as school_name 
            FROM users u 
            LEFT JOIN schools s ON u.school_id = s.id 
        `;
        const params: any[] = [];

        // Multi-tenancy check: School admin can only view users from their own school
        if (session.role === 'admin_sekolah') {
            query += ` WHERE u.school_id = ? `;
            params.push(session.schoolId || '');
        }

        query += ` ORDER BY u.created_at DESC `;

        const [rows]: [any[], any] = await connection.query(query, params);

        const users = rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            schoolId: row.school_id,
            status: row.status,
            lastLogin: row.last_login,
            avatar: row.avatar,
            schoolName: row.school_name
        }));

        return NextResponse.json(users);
    } catch (error) {
        console.error("Database error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session || !['admin_langganan', 'admin_sekolah'].includes(session.role)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let connection;
    try {
        const body = await request.json();
        const { name, email, role, schoolId, status, password } = body;

        if (!name || !email || !role) {
            return NextResponse.json({ message: "Name, email, and role are required" }, { status: 400 });
        }

        connection = await pool.getConnection();

        const id = `user-${Date.now()}`;
        // Multi-tenancy: admin_sekolah can only create users for their own school
        const effectiveSchoolId = session.role === 'admin_sekolah' ? session.schoolId : (schoolId || null);
        const hashedPassword = hashPassword(password || "password123");

        await connection.query(
            `INSERT INTO users (id, name, email, password, role, school_id, status, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, email, hashedPassword, role, effectiveSchoolId, status || 'active', '/assets/Avatar.png']
        );

        return NextResponse.json({ success: true, user: { id, name, email, role, schoolId: effectiveSchoolId, status } });
    } catch (error) {
        console.error("Create user error:", error);
        return NextResponse.json({ message: "Failed to create user" }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
