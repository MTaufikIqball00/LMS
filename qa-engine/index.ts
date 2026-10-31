import { QA_CONFIG } from './config/environments';
import { featureDiscovery } from './core/FeatureDiscovery';
import { browserRunner } from './runners/BrowserRunner';
import { apiRunner } from './runners/ApiRunner';
import { securityRunner } from './runners/SecurityRunner';
import { aiMicroserviceRunner } from './runners/AiMicroserviceRunner';
import { performanceRunner } from './runners/PerformanceRunner';
import { selfHealingAdvisor } from './ai/SelfHealingAdvisor';
import { reportGenerator } from './reporting/ReportGenerator';
import { qaDb } from './storage/db-client';
import { syntheticDataManager } from './core/SyntheticDataManager';

export interface AuditRunSummary {
  runId: string;
  suiteType: string;
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  healthScore: number;
  reports: { jsonPath: string; mdPath: string; htmlPath: string };
}

export class QaOrchestrator {
  public async executeSuite(suiteType: 'smoke' | 'full_regression' | 'security' | 'performance' | 'ai_microservice' | 'multi_role' = 'full_regression'): Promise<AuditRunSummary> {
    console.log(`\n================================================================`);
    console.log(`🚀 MEMULAI QA AUTONOMOUS AUDIT ENGINE: [${suiteType.toUpperCase()}]`);
    console.log(`================================================================\n`);

    const runStartTime = Date.now();
    const runId = await qaDb.createRun(suiteType);

    // 1. Inventarisasi Fitur Otomatis
    const discoveredFeatures = featureDiscovery.discoverAll();
    console.log(`🔍 Ditemukan ${discoveredFeatures.length} fitur terverifikasi dalam repositori.`);

    let total = 0;
    let passed = 0;
    let failed = 0;

    try {
      // 2. Eksekusi Berdasarkan Tipe Suite
      if (suiteType === 'smoke') {
        console.log(`⚡ Menjalankan Smoke Test Cepat...`);
        const apiRes = await apiRunner.runApiAudit(runId);
        total += apiRes.total; passed += apiRes.passed; failed += apiRes.failed;

        const perfRes = await performanceRunner.runPerformanceAudit(runId);
        total += perfRes.total; passed += perfRes.passed; failed += perfRes.failed;
      } else if (suiteType === 'security') {
        console.log(`🛡️ Menjalankan Security & Multi-Tenant Audit...`);
        const secRes = await securityRunner.runSecurityAudit(runId);
        total += secRes.total; passed += secRes.passed; failed += secRes.failed;
      } else if (suiteType === 'ai_microservice') {
        console.log(`🤖 Menjalankan Audit AI Early Warning Microservice...`);
        const aiRes = await aiMicroserviceRunner.runAiAudit(runId);
        total += aiRes.total; passed += aiRes.passed; failed += aiRes.failed;
      } else if (suiteType === 'multi_role') {
        console.log(`👥 Menjalankan Browser Multi-Role Testing...`);
        const browserRes = await browserRunner.runMultiRoleAudit({ runId });
        total += browserRes.total; passed += browserRes.passed; failed += browserRes.failed;
      } else {
        // FULL REGRESSION: Eksekusi seluruh suite secara komprehensif
        console.log(`[1/5] Menguji Keamanan Multi-Tenant, Lisensi Regional, dan IDOR...`);
        const secRes = await securityRunner.runSecurityAudit(runId);
        total += secRes.total; passed += secRes.passed; failed += secRes.failed;

        console.log(`[2/5] Menguji Integritas Endpoint REST API & RBAC...`);
        const apiRes = await apiRunner.runApiAudit(runId);
        total += apiRes.total; passed += apiRes.passed; failed += apiRes.failed;

        console.log(`[3/5] Menguji Microservice AI K-Means & Risk Warning...`);
        const aiRes = await aiMicroserviceRunner.runAiAudit(runId);
        total += aiRes.total; passed += aiRes.passed; failed += aiRes.failed;

        console.log(`[4/5] Menguji Kinerja & Ambang Batas Performa...`);
        const perfRes = await performanceRunner.runPerformanceAudit(runId);
        total += perfRes.total; passed += perfRes.passed; failed += perfRes.failed;

        console.log(`[5/5] Menjalankan Pengujian Browser Multi-Role (Playwright)...`);
        const browserRes = await browserRunner.runMultiRoleAudit({ runId });
        total += browserRes.total; passed += browserRes.passed; failed += browserRes.failed;
      }

      // 3. Evaluasi Self-Healing untuk Temuan yang Terdeteksi
      const { findings } = await qaDb.getRunDetails(runId);
      for (const finding of findings) {
        if (finding.category === 'security' || finding.severity === 'CRITICAL' || finding.severity === 'HIGH') {
          await selfHealingAdvisor.generateProposedPatch(finding.id, finding.affected_feature, finding.root_cause || '');
        }
      }

    } finally {
      // Bersihkan data pengujian sintetis
      await syntheticDataManager.cleanupSyntheticData();
    }

    const durationMs = Date.now() - runStartTime;
    const healthScore = total > 0 ? Math.max(0, Math.round((passed / total) * 100)) : 100;

    await qaDb.updateRun(runId, {
      status: failed === 0 ? 'passed' : 'completed',
      end_time: new Date(),
      duration_ms: durationMs,
      total_tests: total,
      passed_tests: passed,
      failed_tests: failed,
      health_score: healthScore,
    });

    // 4. Buat Laporan Terstruktur
    const reports = await reportGenerator.generateFullAuditReport(runId);

    console.log(`\n================================================================`);
    console.log(`🏁 AUDIT SELESAI: Run ID [${runId}]`);
    console.log(`📊 Hasil: Total ${total} | Passed: ${passed} | Failed: ${failed} | Skor: ${healthScore}%`);
    console.log(`📄 Laporan JSON: ${reports.jsonPath}`);
    console.log(`📄 Laporan MD  : ${reports.mdPath}`);
    console.log(`📄 Laporan HTML: ${reports.htmlPath}`);
    console.log(`================================================================\n`);

    return {
      runId,
      suiteType,
      totalTests: total,
      passed,
      failed,
      durationMs,
      healthScore,
      reports,
    };
  }
}

export const qaOrchestrator = new QaOrchestrator();

// CLI Entry Point
if (require.main === module) {
  const suiteArg = (process.argv[2] as any) || 'full_regression';
  qaOrchestrator.executeSuite(suiteArg).then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('Fatal audit failure:', err);
    process.exit(1);
  });
}
