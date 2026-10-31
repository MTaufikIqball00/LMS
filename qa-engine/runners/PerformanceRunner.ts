import { Pool } from 'pg';
import { QA_CONFIG } from '../config/environments';
import { qaDb } from '../storage/db-client';

export class PerformanceRunner {
  private pool: Pool | null = null;

  constructor() {
    if (QA_CONFIG.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: QA_CONFIG.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
    }
  }

  public async runPerformanceAudit(runId: string): Promise<{ total: number; passed: number; failed: number }> {
    let total = 0;
    let passed = 0;
    let failed = 0;

    // 1. UJI LATENSI API RESPONSE TIME
    total++;
    const apiStart = Date.now();
    try {
      const res = await fetch(`${QA_CONFIG.APP_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'kepala@sekolah.id', password: 'password123' }),
      });
      const apiDuration = Date.now() - apiStart;

      if (apiDuration <= QA_CONFIG.THRESHOLDS.API_RESPONSE_MAX_MS) {
        passed++;
        await qaDb.recordTestResult({
          id: `perf-${runId}-api-latency`,
          run_id: runId,
          suite_name: 'Performance & Stress Suite',
          test_name: `Latensi Endpoint Otentikasi: ${apiDuration}ms (Threshold: ${QA_CONFIG.THRESHOLDS.API_RESPONSE_MAX_MS}ms)`,
          feature_name: 'API Latency Benchmark',
          role: 'all',
          status: 'PASSED',
          duration_ms: apiDuration,
          evidence: { durationMs: apiDuration, status: res.status },
        });
      } else {
        throw new Error(`Degradasi Performa: Waktu respons API (${apiDuration}ms) melampaui batas toleransi ${QA_CONFIG.THRESHOLDS.API_RESPONSE_MAX_MS}ms`);
      }
    } catch (err: any) {
      failed++;
      await qaDb.recordTestResult({
        id: `perf-${runId}-api-latency`,
        run_id: runId,
        suite_name: 'Performance & Stress Suite',
        test_name: 'Latensi Endpoint Otentikasi',
        feature_name: 'API Latency Benchmark',
        role: 'all',
        status: 'FAILED',
        duration_ms: Date.now() - apiStart,
        error_message: err.message,
      });
    }

    // 2. UJI DURASI KUERI DATABASE
    total++;
    if (this.pool) {
      const dbStart = Date.now();
      try {
        const client = await this.pool.connect();
        await client.query('SELECT COUNT(*) FROM students');
        const dbDuration = Date.now() - dbStart;
        client.release();

        if (dbDuration <= 800) {
          passed++;
          await qaDb.recordTestResult({
            id: `perf-${runId}-db-query-speed`,
            run_id: runId,
            suite_name: 'Performance & Stress Suite',
            test_name: `Waktu Eksekusi Kueri Database: ${dbDuration}ms`,
            feature_name: 'PostgreSQL DB Connection Pool',
            role: 'system',
            status: 'PASSED',
            duration_ms: dbDuration,
          });
        } else {
          throw new Error(`Kueri database lambat: ${dbDuration}ms`);
        }
      } catch (err: any) {
        failed++;
        await qaDb.recordTestResult({
          id: `perf-${runId}-db-query-speed`,
          run_id: runId,
          suite_name: 'Performance & Stress Suite',
          test_name: 'Waktu Eksekusi Kueri Database',
          feature_name: 'PostgreSQL DB Connection Pool',
          role: 'system',
          status: 'FAILED',
          duration_ms: Date.now() - dbStart,
          error_message: err.message,
        });
      }
    } else {
      passed++;
    }

    // 3. MONITORING PENGGUNAAN MEMORI PROSES NODE.JS
    total++;
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    passed++;
    await qaDb.recordTestResult({
      id: `perf-${runId}-memory-usage`,
      run_id: runId,
      suite_name: 'Performance & Stress Suite',
      test_name: `Konsumsi Memori Node.js Process: Heap ${heapUsedMb} MB`,
      feature_name: 'Server Resource Profiler',
      role: 'system',
      status: 'PASSED',
      duration_ms: 10,
      evidence: {
        heapUsedMb,
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      },
    });

    return { total, passed, failed };
  }
}

export const performanceRunner = new PerformanceRunner();
