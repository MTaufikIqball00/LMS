import { Pool } from 'pg';
import { QA_CONFIG } from '../config/environments';

export class SyntheticDataManager {
  private pool: Pool | null = null;
  private trackedIds: { table: string; id: string }[] = [];

  constructor() {
    if (QA_CONFIG.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: QA_CONFIG.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
    }
  }

  public trackRecord(table: string, id: string) {
    this.trackedIds.push({ table, id });
  }

  /**
   * Membuat synthetic test student untuk pengujian isolasi tanpa mengganggu data riil
   */
  public generateSyntheticStudent(tenantId: string) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return {
      id: `synthetic-student-${randomSuffix}`,
      userId: `synthetic-user-${randomSuffix}`,
      name: `Synthetic Test Student ${randomSuffix}`,
      email: `synthetic.student.${randomSuffix}@test-isolated.sch.id`,
      schoolId: tenantId,
      class: '10-A',
      gpa: 3.5,
      attendanceRate: 92,
      riskStatus: 'Aman',
      riskScore: 12.5,
    };
  }

  /**
   * Membersihkan HANYA data pengujian sintetis yang dibuat oleh QA Engine
   */
  public async cleanupSyntheticData(): Promise<{ cleanedCount: number }> {
    if (!this.pool || this.trackedIds.length === 0) return { cleanedCount: 0 };
    let cleaned = 0;

    const client = await this.pool.connect();
    try {
      for (const item of this.trackedIds) {
        // Keamanan ketat: Hanya hapus ID yang diawali dengan 'synthetic-' atau 'qa-'
        if (item.id.startsWith('synthetic-') || item.id.startsWith('qa-')) {
          await client.query(`DELETE FROM ${item.table} WHERE id = $1`, [item.id]);
          cleaned++;
        }
      }
      this.trackedIds = [];
      return { cleanedCount: cleaned };
    } catch (err) {
      console.warn('⚠️ Gagal membersihkan data sintetis secara menyeluruh:', err);
      return { cleanedCount: cleaned };
    } finally {
      client.release();
    }
  }
}

export const syntheticDataManager = new SyntheticDataManager();
