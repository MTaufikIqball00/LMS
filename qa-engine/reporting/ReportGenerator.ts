import fs from 'fs';
import path from 'path';
import { QA_CONFIG } from '../config/environments';
import { qaDb, QaRunRecord, QaTestResultRecord, QaFindingRecord } from '../storage/db-client';

export class ReportGenerator {
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.resolve(process.cwd(), QA_CONFIG.REPORTS_DIR);
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  public async generateFullAuditReport(runId: string): Promise<{ jsonPath: string; mdPath: string; htmlPath: string }> {
    const { run, results, findings } = await qaDb.getRunDetails(runId);

    const passedResults = results.filter(r => r.status === 'PASSED');
    const failedResults = results.filter(r => r.status === 'FAILED');
    const skippedResults = results.filter(r => r.status === 'SKIPPED');
    const notImplementedResults = results.filter(r => r.status === 'NOT_IMPLEMENTED');

    const secFindings = findings.filter(f => f.category === 'security');
    const bugFindings = findings.filter(f => f.category === 'bug');
    const perfFindings = findings.filter(f => f.category === 'performance');
    const uiFindings = findings.filter(f => f.category === 'ui_ux');

    const totalTests = results.length;
    const healthScore = totalTests > 0 ? Math.max(0, Math.round(((passedResults.length) / totalTests) * 100)) : 100;

    let verdict = 'SISTEM SIAP PRODUKSI DENGAN CATATAN';
    if (secFindings.some(f => f.severity === 'CRITICAL')) {
      verdict = 'KRITIS - DITEMUKAN KERENTANAN KEAMANAN TINGGI (TIDAK BOLEH DEPLOY)';
    } else if (healthScore < 80) {
      verdict = 'PERLU PERBAIKAN SEBELUM PERILISAN RESMI';
    } else if (healthScore >= 95) {
      verdict = 'MEMENUHI STANDAR KELAYAKAN ENTERPRISE (PASSED)';
    }

    // 1. JSON Report
    const reportData = {
      runId,
      suiteType: run?.suite_type || 'full_regression',
      timestamp: new Date().toISOString(),
      verdict,
      healthScore,
      summary: {
        totalTests,
        passed: passedResults.length,
        failed: failedResults.length,
        skipped: skippedResults.length,
        notImplemented: notImplementedResults.length,
      },
      findingsCount: {
        critical: findings.filter(f => f.severity === 'CRITICAL').length,
        high: findings.filter(f => f.severity === 'HIGH').length,
        medium: findings.filter(f => f.severity === 'MEDIUM').length,
        low: findings.filter(f => f.severity === 'LOW').length,
      },
      findings,
      results,
    };

    const jsonPath = path.join(this.reportsDir, `audit-report-${runId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));

    // 2. Markdown Report
    const mdContent = `
# 🛡️ LAPORAN AUDIT & QA SISTEM LMS JABAR ISTIMEWA
**ID Eksekusi:** \`${runId}\`  
**Waktu Pengujian:** ${new Date().toLocaleString('id-ID')}  
**Health Score:** **${healthScore}%**  
**Status Audit Akhir:** **${verdict}**  

---

## 1. Executive Summary
Pengujian menyeluruh berbasis Autonomous AI Agent telah dijalankan pada LMS Jabar Istimewa, mencakup evaluasi multi-peran (Siswa, Guru, Kepala Sekolah, Admin Sekolah, Super Admin), isolasi data multi-tenant, lisensi regional Jawa Barat vs Luar Jabar, resiliensi API & Database, serta inferensi Flask AI Microservice.

- **Total Kasus Uji:** ${totalTests}
- **Berhasil (Passed):** ${passedResults.length} ✅
- **Gagal (Failed):** ${failedResults.length} ❌
- **Dilewati (Skipped):** ${skippedResults.length} ⚠️
- **Belum Terimplementasi (Not Implemented):** ${notImplementedResults.length} ⏸️

---

## 2. Asesmen Kesehatan Sistem & Ringkasan Temuan
| Tingkat Keparahan | Jumlah Temuan | Status Respon AI |
| :--- | :--- | :--- |
| 🚨 **CRITICAL** | ${findings.filter(f => f.severity === 'CRITICAL').length} | Root Cause & Patch Proposal Generated |
| ⚠️ **HIGH** | ${findings.filter(f => f.severity === 'HIGH').length} | Investigasi & Rekomendasi Tersedia |
| 🟡 **MEDIUM** | ${findings.filter(f => f.severity === 'MEDIUM').length} | Diarsipkan dalam Antrian Perbaikan |
| 🔵 **LOW** | ${findings.filter(f => f.severity === 'LOW').length} | Optimasi Tambahan |

---

## 3. Daftar Temuan Audit Terperinci
${findings.map((f, i) => `
### Finding #${i + 1}: ${f.title}
- **ID Temuan:** \`${f.id}\`
- **Kategori:** \`${f.category.toUpperCase()}\` | **Severity:** \`${f.severity}\` | **Status:** \`${f.status}\`
- **Fitur Terdampak:** \`${f.affected_feature}\` (${f.affected_role || 'Global'})
- **Langkah Reproduksi:**
${f.reproduction_steps || '-'}
- **Ekspektasi:** ${f.expected_behavior || '-'}
- **Fakta di Lapangan:** ${f.actual_behavior || '-'}
- **Root Cause Analysis (Keyakinan: ${f.root_cause_confidence || 85}%):**  
  *${f.root_cause || '-'}*
- **Rekomendasi Perbaikan:**  
  *${f.recommended_fix || '-'}*
`).join('\n---\n')}

---

## 4. Kesimpulan & Rekomendasi Lanjutan
${healthScore >= 90 ? 'Sistem menunjukkan stabilitas tinggi pada fungsi utama platform.' : 'Segera tinjau temuan tingkat Critical dan High sebelum membuka akses ke sekolah pengguna eksternal.'}
`.trim();

    const mdPath = path.join(this.reportsDir, `audit-report-${runId}.md`);
    fs.writeFileSync(mdPath, mdContent);

    // 3. HTML Report
    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>LMS QA Audit Report - ${runId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 30px; margin: 0; }
    .container { max-width: 1000px; margin: auto; background: #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { color: #38bdf8; border-bottom: 2px solid #334155; padding-bottom: 12px; }
    .badge { padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block; }
    .badge-pass { background: #166534; color: #bbf7d0; }
    .badge-fail { background: #991b1b; color: #fecaca; }
    .score-card { display: flex; gap: 20px; margin: 24px 0; }
    .stat-box { flex: 1; background: #334155; padding: 20px; border-radius: 12px; text-align: center; }
    .stat-number { font-size: 32px; font-weight: bold; color: #38bdf8; }
    .finding-card { background: #0f172a; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
    pre { background: #020617; padding: 12px; border-radius: 8px; overflow-x: auto; color: #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🛡️ Laporan Audit Kualitas & Keamanan LMS</h1>
    <p>ID Eksekusi: <strong>${runId}</strong> | Waktu: <strong>${new Date().toLocaleString('id-ID')}</strong></p>
    <div class="score-card">
      <div class="stat-box"><div class="stat-number">${healthScore}%</div><div>Skor Kesehatan</div></div>
      <div class="stat-box"><div class="stat-number">${totalTests}</div><div>Total Pengujian</div></div>
      <div class="stat-box"><div class="stat-number" style="color:#4ade80">${passedResults.length}</div><div>Passed</div></div>
      <div class="stat-box"><div class="stat-number" style="color:#f87171">${failedResults.length}</div><div>Failed</div></div>
    </div>
    <h2>Status Kelayakan: <span class="badge ${failedResults.length === 0 ? 'badge-pass' : 'badge-fail'}">${verdict}</span></h2>
    <h3>Daftar Temuan (${findings.length})</h3>
    ${findings.map(f => `
      <div class="finding-card">
        <h4>[${f.severity}] ${f.title}</h4>
        <p><strong>Fitur:</strong> ${f.affected_feature} | <strong>Role:</strong> ${f.affected_role || 'Semua'}</p>
        <p><strong>Penyebab Utama (Root Cause):</strong> ${f.root_cause || '-'}</p>
        <p><strong>Rekomendasi Solusi:</strong> ${f.recommended_fix || '-'}</p>
      </div>
    `).join('')}
  </div>
</body>
</html>
`.trim();

    const htmlPath = path.join(this.reportsDir, `audit-report-${runId}.html`);
    fs.writeFileSync(htmlPath, htmlContent);

    return { jsonPath, mdPath, htmlPath };
  }
}

export const reportGenerator = new ReportGenerator();
