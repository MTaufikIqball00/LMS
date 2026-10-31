const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

async function setupQaTables() {
  console.log("=== Setting up QA Database Tables ===");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log(" Connected to database.");

    // 1. qa_runs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qa_runs (
        id VARCHAR(50) PRIMARY KEY,
        suite_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        start_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMPTZ,
        duration_ms INT DEFAULT 0,
        total_tests INT DEFAULT 0,
        passed_tests INT DEFAULT 0,
        failed_tests INT DEFAULT 0,
        skipped_tests INT DEFAULT 0,
        health_score NUMERIC(5,2) DEFAULT 100.00,
        summary JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(" Created qa_runs table.");

    // 2. qa_test_results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qa_test_results (
        id VARCHAR(50) PRIMARY KEY,
        run_id VARCHAR(50) NOT NULL REFERENCES qa_runs(id) ON DELETE CASCADE,
        suite_name VARCHAR(100) NOT NULL,
        test_name VARCHAR(255) NOT NULL,
        feature_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'unauthenticated',
        status VARCHAR(20) NOT NULL CHECK (status IN ('PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'NOT_IMPLEMENTED')),
        duration_ms INT DEFAULT 0,
        error_message TEXT,
        evidence JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(" Created qa_test_results table.");

    // 3. qa_findings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qa_findings (
        id VARCHAR(50) PRIMARY KEY,
        run_id VARCHAR(50) NOT NULL REFERENCES qa_runs(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
        title VARCHAR(255) NOT NULL,
        affected_feature VARCHAR(255) NOT NULL,
        affected_role VARCHAR(50),
        reproduction_steps TEXT,
        expected_behavior TEXT,
        actual_behavior TEXT,
        error_trace TEXT,
        console_logs JSONB DEFAULT '[]'::jsonb,
        network_trace JSONB DEFAULT '[]'::jsonb,
        screenshot_path TEXT,
        root_cause TEXT,
        root_cause_confidence NUMERIC(5,2) DEFAULT 0.00,
        recommended_fix TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'VERIFIED', 'IGNORED')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(" Created qa_findings table.");

    // 4. qa_healing_proposals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qa_healing_proposals (
        id VARCHAR(50) PRIMARY KEY,
        finding_id VARCHAR(50) NOT NULL REFERENCES qa_findings(id) ON DELETE CASCADE,
        file_path VARCHAR(255) NOT NULL,
        patch_diff TEXT NOT NULL,
        explanation TEXT NOT NULL,
        test_verification_result TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(" Created qa_healing_proposals table.");

    // 5. qa_schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qa_schedules (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        cron_expression VARCHAR(50) NOT NULL,
        suite_type VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_run TIMESTAMPTZ,
        next_run TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(" Created qa_schedules table.");

    // Seed default schedules if not exist
    const schedCount = await client.query("SELECT COUNT(*) FROM qa_schedules");
    if (parseInt(schedCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO qa_schedules (id, name, cron_expression, suite_type, is_active) VALUES
        ('sched-smoke', 'Smoke Test Periodik', '*/30 * * * *', 'smoke', true),
        ('sched-nightly', 'Nightly Full Regression', '0 2 * * *', 'full_regression', true),
        ('sched-security', 'Daily Security Audit', '0 4 * * *', 'security', true),
        ('sched-ai', 'AI Microservice Health Check', '0 */2 * * *', 'ai_microservice', true);
      `);
      console.log(" Seeded initial QA schedules.");
    }

    client.release();
    await pool.end();
    console.log(" QA Database Setup Completed Successfully!");
  } catch (err) {
    console.error(" Error setting up QA tables:", err);
    await pool.end();
    process.exit(1);
  }
}

setupQaTables();
