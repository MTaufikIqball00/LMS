import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { QA_CONFIG } from '../config/environments';
import { TEST_ACCOUNTS, TestRoleAccount } from '../config/test-roles';
import { sessionManager } from '../core/SessionManager';
import { qaDb, QaTestResultRecord, QaFindingRecord } from '../storage/db-client';

export interface BrowserRunOptions {
  runId: string;
  rolesToTest?: (keyof typeof TEST_ACCOUNTS)[];
  captureScreenshots?: boolean;
}

export class BrowserRunner {
  private screenshotDir: string;

  constructor() {
    this.screenshotDir = path.resolve(process.cwd(), QA_CONFIG.SCREENSHOT_DIR);
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  public async runMultiRoleAudit(options: BrowserRunOptions): Promise<{ total: number; passed: number; failed: number }> {
    const roles = options.rolesToTest || (Object.keys(TEST_ACCOUNTS) as (keyof typeof TEST_ACCOUNTS)[]);
    let total = 0;
    let passed = 0;
    let failed = 0;

    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({
        headless: QA_CONFIG.HEADLESS,
      });

      for (const roleKey of roles) {
        const account = TEST_ACCOUNTS[roleKey];
        const roleResult = await this.auditSingleRole(browser, options.runId, roleKey, account);
        total += roleResult.total;
        passed += roleResult.passed;
        failed += roleResult.failed;
      }
    } catch (err: any) {
      console.error('💥 Kesalahan fatal BrowserRunner:', err);
    } finally {
      if (browser) await browser.close();
    }

    return { total, passed, failed };
  }

  private async auditSingleRole(
    browser: Browser,
    runId: string,
    roleKey: string,
    account: TestRoleAccount
  ): Promise<{ total: number; passed: number; failed: number }> {
    let total = 0;
    let passed = 0;
    let failed = 0;

    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });

    const consoleLogs: string[] = [];
    const networkErrors: { url: string; status: number; method: string }[] = [];

    // Buat token JWT untuk role ini
    const token = await sessionManager.createJwtForRole(roleKey as any);
    await sessionManager.applyAuthToContext(context, token);

    const page: Page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleLogs.push(`[CONSOLE_ERROR] ${msg.text()}`);
      }
    });

    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        networkErrors.push({
          url: res.url(),
          status: res.status(),
          method: res.request().method(),
        });
      }
    });

    try {
      // 1. Verifikasi Akses ke Landing Page yang Diharapkan
      total++;
      const landingStartTime = Date.now();
      try {
        const landingRes = await page.goto(`${QA_CONFIG.APP_URL}${account.expectedLandingPage}`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        const currentUrl = page.url();
        const duration = Date.now() - landingStartTime;
        const isSuccess = (!landingRes || landingRes.status() < 400) && currentUrl.includes(account.expectedLandingPage);

        if (isSuccess) {
          passed++;
          await qaDb.recordTestResult({
            id: `res-${runId}-${roleKey}-landing`,
            run_id: runId,
            suite_name: 'Browser Multi-Role',
            test_name: `Navigasi Landing Page [${account.roleName}] -> ${account.expectedLandingPage}`,
            feature_name: `${account.roleName} Dashboard`,
            role: account.roleName,
            status: 'PASSED',
            duration_ms: duration,
          });
        } else {
          throw new Error(`Gagal mendarat di ${account.expectedLandingPage}. Berada di: ${currentUrl} (Status: ${landingRes?.status()})`);
        }
      } catch (err: any) {
        failed++;
        const screenshotPath = await this.captureFailureScreenshot(page, runId, `${roleKey}_landing_failed`);
        await qaDb.recordTestResult({
          id: `res-${runId}-${roleKey}-landing`,
          run_id: runId,
          suite_name: 'Browser Multi-Role',
          test_name: `Navigasi Landing Page [${account.roleName}] -> ${account.expectedLandingPage}`,
          feature_name: `${account.roleName} Dashboard`,
          role: account.roleName,
          status: 'FAILED',
          duration_ms: Date.now() - landingStartTime,
          error_message: err.message,
          evidence: { screenshotPath, consoleLogs, networkErrors },
        });

        await qaDb.recordFinding({
          id: `find-${runId}-${roleKey}-landing`,
          run_id: runId,
          category: 'bug',
          severity: 'HIGH',
          title: `Kegagalan Navigasi Landing Page untuk Role ${account.roleName}`,
          affected_feature: `${account.roleName} Landing Page`,
          affected_role: account.roleName,
          reproduction_steps: `1. Login sebagai ${account.email}\n2. Navigasi ke ${account.expectedLandingPage}`,
          expected_behavior: `Halaman terbuka dengan status 200`,
          actual_behavior: `Mengalami timeout atau redirect tak terduga`,
          error_trace: err.stack || err.message,
          console_logs: consoleLogs,
          network_trace: networkErrors,
          screenshot_path: screenshotPath,
          root_cause: `Komponen dashboard atau data dependency gagal termuat`,
          root_cause_confidence: 85.0,
          recommended_fix: `Periksa dependensi API dashboard dan komponen fallback UI`,
          status: 'OPEN',
        });
      }

      // 2. Verifikasi Halaman yang Diizinkan (Permitted Pages)
      for (const permittedPath of account.permittedPages.slice(0, 5)) { // Sampling halaman utama
        total++;
        const start = Date.now();
        try {
          const res = await page.goto(`${QA_CONFIG.APP_URL}${permittedPath}`, {
            waitUntil: 'domcontentloaded',
            timeout: 25000,
          });
          const duration = Date.now() - start;
          const isSuccess = (!res || res.status() < 400) && !page.url().includes('/login');

          if (isSuccess) {
            passed++;
            await qaDb.recordTestResult({
              id: `res-${runId}-${roleKey}-${permittedPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
              run_id: runId,
              suite_name: 'Browser Multi-Role',
              test_name: `Akses Halaman Diizinkan [${account.roleName}] -> ${permittedPath}`,
              feature_name: permittedPath,
              role: account.roleName,
              status: 'PASSED',
              duration_ms: duration,
            });
          } else {
            throw new Error(`Akses diizinkan terblokir atau terlempar ke login: URL saat ini ${page.url()}`);
          }
        } catch (err: any) {
          failed++;
          const screenshotPath = await this.captureFailureScreenshot(page, runId, `${roleKey}_permitted_${permittedPath.replace(/[^a-zA-Z0-9]/g, '_')}`);
          await qaDb.recordTestResult({
            id: `res-${runId}-${roleKey}-${permittedPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
            run_id: runId,
            suite_name: 'Browser Multi-Role',
            test_name: `Akses Halaman Diizinkan [${account.roleName}] -> ${permittedPath}`,
            feature_name: permittedPath,
            role: account.roleName,
            status: 'FAILED',
            duration_ms: Date.now() - start,
            error_message: err.message,
            evidence: { screenshotPath },
          });
        }
      }

      // 3. Verifikasi Proteksi Akses Terlarang (Forbidden Pages RBAC Test)
      for (const forbiddenPath of account.forbiddenPages.slice(0, 3)) {
        total++;
        const start = Date.now();
        try {
          await page.goto(`${QA_CONFIG.APP_URL}${forbiddenPath}`, {
            waitUntil: 'domcontentloaded',
            timeout: 8000,
          });
          const duration = Date.now() - start;
          const currentUrl = page.url();

          // Sesuai middleware: user harus diarahkan keluar (ke dashboard atau /notifikasi), bukan tetap berada di forbiddenPath
          const isBlocked = !currentUrl.includes(forbiddenPath) || currentUrl.includes('/dashboard') || currentUrl.includes('/notifikasi');

          if (isBlocked) {
            passed++;
            await qaDb.recordTestResult({
              id: `res-${runId}-${roleKey}-rbac-${forbiddenPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
              run_id: runId,
              suite_name: 'RBAC Access Control',
              test_name: `Penolakan Akses Terlarang [${account.roleName}] -> ${forbiddenPath}`,
              feature_name: 'Middleware RBAC Guard',
              role: account.roleName,
              status: 'PASSED',
              duration_ms: duration,
            });
          } else {
            throw new Error(`VULNERABILITY: Role ${account.roleName} berhasil mengakses halaman terlarang: ${forbiddenPath}`);
          }
        } catch (err: any) {
          failed++;
          const screenshotPath = await this.captureFailureScreenshot(page, runId, `${roleKey}_forbidden_${forbiddenPath.replace(/[^a-zA-Z0-9]/g, '_')}`);
          await qaDb.recordTestResult({
            id: `res-${runId}-${roleKey}-rbac-${forbiddenPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
            run_id: runId,
            suite_name: 'RBAC Access Control',
            test_name: `Penolakan Akses Terlarang [${account.roleName}] -> ${forbiddenPath}`,
            feature_name: 'Middleware RBAC Guard',
            role: account.roleName,
            status: 'FAILED',
            duration_ms: Date.now() - start,
            error_message: err.message,
            evidence: { screenshotPath },
          });

          await qaDb.recordFinding({
            id: `find-${runId}-${roleKey}-rbac-${Date.now()}`,
            run_id: runId,
            category: 'security',
            severity: 'CRITICAL',
            title: `Broken Access Control: ${account.roleName} dapat membuka ${forbiddenPath}`,
            affected_feature: forbiddenPath,
            affected_role: account.roleName,
            reproduction_steps: `1. Login sebagai ${account.email}\n2. Buka URL langsung ${forbiddenPath}`,
            expected_behavior: `Akses ditolak dan dialihkan ke dashboard/notifikasi`,
            actual_behavior: `Halaman terbuka tanpa otorisasi yang valid`,
            error_trace: err.stack || err.message,
            screenshot_path: screenshotPath,
            root_cause: `Path matcher pada middleware.ts melewatkan proteksi untuk rute ini`,
            root_cause_confidence: 90.0,
            recommended_fix: `Tambahkan rute ke guard matcher di src/middleware.ts`,
            status: 'OPEN',
          });
        }
      }

    } finally {
      await context.close();
    }

    return { total, passed, failed };
  }

  private async captureFailureScreenshot(page: Page, runId: string, prefix: string): Promise<string> {
    try {
      const filename = `${prefix}_${Date.now()}.png`;
      const fullPath = path.join(this.screenshotDir, filename);
      await page.screenshot({ path: fullPath, fullPage: true });
      return fullPath;
    } catch {
      return '';
    }
  }
}

export const browserRunner = new BrowserRunner();
