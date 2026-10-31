import { qaDb, QaHealingProposalRecord } from '../storage/db-client';

export interface ProposedPatch {
  id: string;
  findingId: string;
  filePath: string;
  diff: string;
  explanation: string;
}

export class SelfHealingAdvisor {
  /**
   * Menghasilkan usulan perbaikan kode terkecil (minimal patch) dalam format unified diff
   * PERINGATAN KESELAMATAN: AI TIDAK MENERAPKAN PATCH SECARA LANGSUNG KE PRODUKSI TANPA PERSETUJUAN MANUAL
   */
  public async generateProposedPatch(
    findingId: string,
    affectedFeature: string,
    rootCause: string
  ): Promise<ProposedPatch | null> {
    const proposalId = `patch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Kasus 1: Perbaikan Isolasi Multi-Tenant Presensi
    if (affectedFeature.includes('attendance/records')) {
      const diff = `
--- a/src/app/api/attendance/records/route.ts
+++ b/src/app/api/attendance/records/route.ts
@@ -28,5 +28,8 @@
     if (session.role === "student") {
       query += \` WHERE a.student_id = ? OR s.user_id = ? \`;
       params.push(session.studentId || session.userId || session.id, session.id);
+    } else if (session.schoolId) {
+      query += \` WHERE u.school_id = ? \`;
+      params.push(session.schoolId);
     }
`.trim();

      const patch: ProposedPatch = {
        id: proposalId,
        findingId,
        filePath: 'src/app/api/attendance/records/route.ts',
        diff,
        explanation: 'Menambahkan klausul WHERE u.school_id = session.schoolId untuk role non-siswa guna mencegah kebocoran data presensi lintas sekolah (tenant isolation).'
      };

      await qaDb.recordHealingProposal({
        id: patch.id,
        finding_id: patch.findingId,
        file_path: patch.filePath,
        patch_diff: patch.diff,
        explanation: patch.explanation,
        status: 'PENDING_REVIEW'
      });

      return patch;
    }

    return null;
  }
}

export const selfHealingAdvisor = new SelfHealingAdvisor();
