import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { QA_CONFIG } from '../config/environments';

export interface QaRunRecord {
  id: string;
  suite_type: string;
  status: 'running' | 'passed' | 'failed' | 'completed';
  start_time: Date;
  end_time?: Date;
  duration_ms: number;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  health_score: number;
  summary: any;
}

export interface QaTestResultRecord {
  id: string;
  run_id: string;
  suite_name: string;
  test_name: string;
  feature_name: string;
  role: string;
  status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED' | 'NOT_IMPLEMENTED';
  duration_ms: number;
  error_message?: string;
  evidence?: any;
}

export interface QaFindingRecord {
  id: string;
  run_id: string;
  category: 'security' | 'bug' | 'performance' | 'ui_ux' | 'compliance';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  affected_feature: string;
  affected_role?: string;
  reproduction_steps?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  error_trace?: string;
  console_logs?: any;
  network_trace?: any;
  screenshot_path?: string;
  root_cause?: string;
  root_cause_confidence?: number;
  recommended_fix?: string;
  status: 'OPEN' | 'RESOLVED' | 'VERIFIED' | 'IGNORED';
}

export interface QaHealingProposalRecord {
  id: string;
  finding_id: string;
  file_path: string;
  patch_diff: string;
  explanation: string;
  test_verification_result?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
}

class QaDbClient {
  private pool: Pool | null = null;
  private isConnected = false;
  private localFallbackDir = path.resolve(process.cwd(), 'qa-data/local-db');

  constructor() {
    if (!fs.existsSync(this.localFallbackDir)) {
      fs.mkdirSync(this.localFallbackDir, { recursive: true });
    }

    if (QA_CONFIG.DATABASE_URL) {
      try {
        this.pool = new Pool({
          connectionString: QA_CONFIG.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
        });
      } catch (err) {
        console.warn('⚠️ Tidak dapat menginisialisasi PgPool QA, beralih ke cache lokal:', err);
      }
    }
  }

  private async getClient() {
    if (!this.pool) return null;
    try {
      const client = await this.pool.connect();
      return client;
    } catch (err) {
      console.warn('⚠️ Gagal terhubung ke Supabase QA database, beralih ke penyimpanan lokal:', err);
      return null;
    }
  }

  public async createRun(suiteType: string): Promise<string> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const client = await this.getClient();

    if (client) {
      try {
        await client.query(
          `INSERT INTO qa_runs (id, suite_type, status, start_time, total_tests, passed_tests, failed_tests, skipped_tests, health_score, summary)
           VALUES ($1, $2, 'running', NOW(), 0, 0, 0, 0, 100.0, '{}')`,
          [runId, suiteType]
        );
      } finally {
        client.release();
      }
    }

    // Selalu simpan juga di fallback lokal agar cepat dan tahan offline
    const runData: QaRunRecord = {
      id: runId,
      suite_type: suiteType,
      status: 'running',
      start_time: new Date(),
      duration_ms: 0,
      total_tests: 0,
      passed_tests: 0,
      failed_tests: 0,
      skipped_tests: 0,
      health_score: 100.0,
      summary: {},
    };
    fs.writeFileSync(path.join(this.localFallbackDir, `${runId}.json`), JSON.stringify(runData, null, 2));

    return runId;
  }

  public async updateRun(runId: string, data: Partial<QaRunRecord>): Promise<void> {
    const client = await this.getClient();
    if (client) {
      try {
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (data.status) { fields.push(`status = $${idx++}`); values.push(data.status); }
        if (data.end_time) { fields.push(`end_time = $${idx++}`); values.push(data.end_time); }
        if (data.duration_ms !== undefined) { fields.push(`duration_ms = $${idx++}`); values.push(data.duration_ms); }
        if (data.total_tests !== undefined) { fields.push(`total_tests = $${idx++}`); values.push(data.total_tests); }
        if (data.passed_tests !== undefined) { fields.push(`passed_tests = $${idx++}`); values.push(data.passed_tests); }
        if (data.failed_tests !== undefined) { fields.push(`failed_tests = $${idx++}`); values.push(data.failed_tests); }
        if (data.skipped_tests !== undefined) { fields.push(`skipped_tests = $${idx++}`); values.push(data.skipped_tests); }
        if (data.health_score !== undefined) { fields.push(`health_score = $${idx++}`); values.push(data.health_score); }
        if (data.summary) { fields.push(`summary = $${idx++}`); values.push(JSON.stringify(data.summary)); }

        if (fields.length > 0) {
          values.push(runId);
          await client.query(`UPDATE qa_runs SET ${fields.join(', ')} WHERE id = $${idx}`, values);
        }
      } finally {
        client.release();
      }
    }

    // Perbarui file lokal
    const localFile = path.join(this.localFallbackDir, `${runId}.json`);
    if (fs.existsSync(localFile)) {
      try {
        const current = JSON.parse(fs.readFileSync(localFile, 'utf8'));
        const updated = { ...current, ...data };
        fs.writeFileSync(localFile, JSON.stringify(updated, null, 2));
      } catch (err) {
        console.error('Gagal memperbarui file QA lokal:', err);
      }
    }
  }

  public async recordTestResult(res: QaTestResultRecord): Promise<void> {
    const client = await this.getClient();
    if (client) {
      try {
        await client.query(
          `INSERT INTO qa_test_results 
           (id, run_id, suite_name, test_name, feature_name, role, status, duration_ms, error_message, evidence)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            res.id,
            res.run_id,
            res.suite_name,
            res.test_name,
            res.feature_name,
            res.role,
            res.status,
            res.duration_ms,
            res.error_message || null,
            JSON.stringify(res.evidence || {}),
          ]
        );
      } finally {
        client.release();
      }
    }

    // Append to local results array for the run
    const resultsFile = path.join(this.localFallbackDir, `${res.run_id}-results.json`);
    let results: QaTestResultRecord[] = [];
    if (fs.existsSync(resultsFile)) {
      try { results = JSON.parse(fs.readFileSync(resultsFile, 'utf8')); } catch { results = []; }
    }
    results.push(res);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  }

  public async recordFinding(finding: QaFindingRecord): Promise<void> {
    const client = await this.getClient();
    if (client) {
      try {
        await client.query(
          `INSERT INTO qa_findings 
           (id, run_id, category, severity, title, affected_feature, affected_role, reproduction_steps, expected_behavior, actual_behavior, error_trace, console_logs, network_trace, screenshot_path, root_cause, root_cause_confidence, recommended_fix, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            finding.id,
            finding.run_id,
            finding.category,
            finding.severity,
            finding.title,
            finding.affected_feature,
            finding.affected_role || null,
            finding.reproduction_steps || null,
            finding.expected_behavior || null,
            finding.actual_behavior || null,
            finding.error_trace || null,
            JSON.stringify(finding.console_logs || []),
            JSON.stringify(finding.network_trace || []),
            finding.screenshot_path || null,
            finding.root_cause || null,
            finding.root_cause_confidence || 0,
            finding.recommended_fix || null,
            finding.status || 'OPEN',
          ]
        );
      } finally {
        client.release();
      }
    }

    // Simpan temuan ke fallback lokal
    const findingsFile = path.join(this.localFallbackDir, `${finding.run_id}-findings.json`);
    let findings: QaFindingRecord[] = [];
    if (fs.existsSync(findingsFile)) {
      try { findings = JSON.parse(fs.readFileSync(findingsFile, 'utf8')); } catch { findings = []; }
    }
    findings.push(finding);
    fs.writeFileSync(findingsFile, JSON.stringify(findings, null, 2));
  }

  public async recordHealingProposal(proposal: QaHealingProposalRecord): Promise<void> {
    const client = await this.getClient();
    if (client) {
      try {
        await client.query(
          `INSERT INTO qa_healing_proposals (id, finding_id, file_path, patch_diff, explanation, test_verification_result, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            proposal.id,
            proposal.finding_id,
            proposal.file_path,
            proposal.patch_diff,
            proposal.explanation,
            proposal.test_verification_result || null,
            proposal.status || 'PENDING_REVIEW',
          ]
        );
      } finally {
        client.release();
      }
    }
  }

  public async getLatestRuns(limit = 10): Promise<QaRunRecord[]> {
    const client = await this.getClient();
    if (client) {
      try {
        const res = await client.query(`SELECT * FROM qa_runs ORDER BY start_time DESC LIMIT $1`, [limit]);
        return res.rows;
      } finally {
        client.release();
      }
    }

    // Local fallback
    try {
      const files = fs.readdirSync(this.localFallbackDir).filter(f => f.startsWith('run-') && f.endsWith('.json') && !f.includes('-results') && !f.includes('-findings'));
      const runs: QaRunRecord[] = files.map(f => JSON.parse(fs.readFileSync(path.join(this.localFallbackDir, f), 'utf8')));
      runs.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
      return runs.slice(0, limit);
    } catch {
      return [];
    }
  }

  public async getRunDetails(runId: string) {
    let run: QaRunRecord | null = null;
    let results: QaTestResultRecord[] = [];
    let findings: QaFindingRecord[] = [];

    const client = await this.getClient();
    if (client) {
      try {
        const runRes = await client.query('SELECT * FROM qa_runs WHERE id = $1', [runId]);
        if (runRes.rows.length > 0) run = runRes.rows[0];

        const resultsRes = await client.query('SELECT * FROM qa_test_results WHERE run_id = $1 ORDER BY created_at ASC', [runId]);
        results = resultsRes.rows;

        const findingsRes = await client.query('SELECT * FROM qa_findings WHERE run_id = $1 ORDER BY created_at ASC', [runId]);
        findings = findingsRes.rows;
      } finally {
        client.release();
      }
    }

    if (!run) {
      // Local fallback
      const runFile = path.join(this.localFallbackDir, `${runId}.json`);
      if (fs.existsSync(runFile)) {
        run = JSON.parse(fs.readFileSync(runFile, 'utf8'));
      }
      const resultsFile = path.join(this.localFallbackDir, `${runId}-results.json`);
      if (fs.existsSync(resultsFile)) {
        results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      }
      const findingsFile = path.join(this.localFallbackDir, `${runId}-findings.json`);
      if (fs.existsSync(findingsFile)) {
        findings = JSON.parse(fs.readFileSync(findingsFile, 'utf8'));
      }
    }

    return { run, results, findings };
  }

  public async getActiveSchedules() {
    const client = await this.getClient();
    if (client) {
      try {
        const res = await client.query('SELECT * FROM qa_schedules WHERE is_active = true');
        return res.rows;
      } finally {
        client.release();
      }
    }
    return [];
  }
}

export const qaDb = new QaDbClient();
