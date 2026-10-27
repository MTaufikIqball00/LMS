import { NextResponse } from "next/server";
import pool from "../../../../lib/db";
const db = pool;
import { RowDataPacket } from "mysql2";
import { getSession } from "../../../../lib/auth/session";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || !["teacher", "admin_sekolah", "admin_langganan", "kepala_sekolah", "headmaster"].includes(session.role)) {
            return NextResponse.json(
                { success: false, message: "Unauthorized: Hanya pengajar atau admin yang dapat memperbarui data risiko" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { data } = body; // Expecting array of { nis, risk_status, risk_score }

        if (!Array.isArray(data)) {
            return NextResponse.json(
                { error: "Data harus berupa array" },
                { status: 400 }
            );
        }

        // We can't do a single bulk update easily with different values for each row in standard SQL without CASE WHEN or multiple queries.
        // For simplicity and safety with mysql2, we'll loop. Transaction would be ideal.

        // Check db connection first
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            for (const item of data) {
                // Assuming 'nis' maps to 'student_id' or we need to lookup 'id' by 'student_id' (NIS)
                // In the previous notebook, 'nis' seemed to be the identifier. 
                // Let's check lms_db.sql again to be sure about column names.
                // students table has: id, student_id (NIM/NIS), risk_status, risk_score

                await connection.query(
                    `UPDATE students 
           SET risk_status = ?, risk_score = ? 
           WHERE student_id = ?`,
                    [item.status_risiko, item.risk_score, item.nis]
                );
            }

            await connection.commit();
            return NextResponse.json({ message: "Data risiko berhasil disimpan" });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error: any) {
        console.error("Error updating risk data:", error);
        return NextResponse.json(
            { error: "Gagal menyimpan data risiko: " + error.message },
            { status: 500 }
        );
    }
}
