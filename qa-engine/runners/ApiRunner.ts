import { QA_CONFIG } from '../config/environments';
import { TEST_ACCOUNTS } from '../config/test-roles';
import { sessionManager } from '../core/SessionManager';
import { qaDb, QaTestResultRecord, QaFindingRecord } from '../storage/db-client';

export class ApiRunner {
  public async runApiAudit(runId: string): Promise<{ total: number; passed: number; failed: number }> {
    let total = 0;
    let passed = 0;
    let failed = 0;

    // Persiapkan token untuk setiap role
    const studentToken = await sessionManager.createJwtForRole('student_jabar');
    const teacherToken = await sessionManager.createJwtForRole('teacher_jabar');
    const schoolAdminToken = await sessionManager.createJwtForRole('school_admin');
    const superAdminToken = await sessionManager.createJwtForRole('super_admin');

    const testEndpoints = [
      // 1. Unauthenticated Checks (Harus 401)
      {
        name: 'Guard Unauthenticated: /api/teacher/dashboard',
        url: '/api/teacher/dashboard',
        method: 'GET',
        headers: {},
        expectedStatus: 401,
        role: 'unauthenticated',
        feature: 'API Authentication Guard',
      },
      {
        name: 'Guard Unauthenticated: /api/admin/dashboard',
        url: '/api/admin/dashboard',
        method: 'GET',
        headers: {},
        expectedStatus: 401,
        role: 'unauthenticated',
        feature: 'API Authentication Guard',
      },
      {
        name: 'Guard Unauthenticated: /api/school-admin/dashboard',
        url: '/api/school-admin/dashboard',
        method: 'GET',
        headers: {},
        expectedStatus: 401,
        role: 'unauthenticated',
        feature: 'API Authentication Guard',
      },

      // 2. Student APIs
      {
        name: 'Student Fetch Assignments: /api/tugas',
        url: '/api/tugas',
        method: 'GET',
        headers: { Cookie: `auth_token=${studentToken}` },
        expectedStatus: 200,
        role: 'student',
        feature: 'Student Assignment API',
      },
      {
        name: 'Student Attendance Records: /api/attendance/records',
        url: '/api/attendance/records',
        method: 'GET',
        headers: { Cookie: `auth_token=${studentToken}` },
        expectedStatus: 200,
        role: 'student',
        feature: 'Student Attendance API',
      },
      {
        name: 'Student Tryout List: /api/tryout',
        url: '/api/tryout',
        method: 'GET',
        headers: { Cookie: `auth_token=${studentToken}` },
        expectedStatus: 200,
        role: 'student',
        feature: 'Student Tryout CBT API',
      },

      // 3. Teacher APIs
      {
        name: 'Teacher Dashboard Stats: /api/teacher/dashboard',
        url: '/api/teacher/dashboard',
        method: 'GET',
        headers: { Cookie: `auth_token=${teacherToken}` },
        expectedStatus: 200,
        role: 'teacher',
        feature: 'Teacher Dashboard API',
      },
      {
        name: 'Teacher Students Roster: /api/teacher/students',
        url: '/api/teacher/students',
        method: 'GET',
        headers: { Cookie: `auth_token=${teacherToken}` },
        expectedStatus: 200,
        role: 'teacher',
        feature: 'Teacher Students API',
      },
      {
        name: 'Teacher Quizzes List: /api/teacher/quizzes',
        url: '/api/teacher/quizzes',
        method: 'GET',
        headers: { Cookie: `auth_token=${teacherToken}` },
        expectedStatus: 200,
        role: 'teacher',
        feature: 'Teacher Quiz Management API',
      },

      // 4. School Admin APIs
      {
        name: 'School Admin Dashboard: /api/school-admin/dashboard',
        url: '/api/school-admin/dashboard',
        method: 'GET',
        headers: { Cookie: `auth_token=${schoolAdminToken}` },
        expectedStatus: 200,
        role: 'admin_sekolah',
        feature: 'School Admin Dashboard API',
      },
      {
        name: 'School Admin Students: /api/school-admin/students',
        url: '/api/school-admin/students',
        method: 'GET',
        headers: { Cookie: `auth_token=${schoolAdminToken}` },
        expectedStatus: 200,
        role: 'admin_sekolah',
        feature: 'School Admin Student Registry API',
      },

      // 5. Subscription Super Admin APIs
      {
        name: 'Super Admin Dashboard: /api/admin/dashboard',
        url: '/api/admin/dashboard',
        method: 'GET',
        headers: { Cookie: `auth_token=${superAdminToken}` },
        expectedStatus: 200,
        role: 'admin_langganan',
        feature: 'Super Admin Dashboard API',
      },
      {
        name: 'Super Admin Schools List: /api/admin/schools',
        url: '/api/admin/schools',
        method: 'GET',
        headers: { Cookie: `auth_token=${superAdminToken}` },
        expectedStatus: 200,
        role: 'admin_langganan',
        feature: 'School Licensing Management API',
      },
      {
        name: 'Super Admin Packages: /api/admin/packages',
        url: '/api/admin/packages',
        method: 'GET',
        headers: { Cookie: `auth_token=${superAdminToken}` },
        expectedStatus: 200,
        role: 'admin_langganan',
        feature: 'Subscription Package API',
      },
      {
        name: 'Super Admin Payments: /api/admin/payments',
        url: '/api/admin/payments',
        method: 'GET',
        headers: { Cookie: `auth_token=${superAdminToken}` },
        expectedStatus: 200,
        role: 'admin_langganan',
        feature: 'Billing & Payments API',
      },

      // 6. Cross-Role Forbidden API Checks
      {
        name: 'Cross-Role Forbidden: Student trying to access /api/teacher/dashboard',
        url: '/api/teacher/dashboard',
        method: 'GET',
        headers: { Cookie: `auth_token=${studentToken}` },
        expectedStatus: 401, // Middleware/handler memblokir role tak berwenang
        role: 'student',
        feature: 'RBAC API Authorization Guard',
      },
      {
        name: 'Cross-Role Forbidden: Teacher trying to access /api/admin/dashboard',
        url: '/api/admin/dashboard',
        method: 'GET',
        headers: { Cookie: `auth_token=${teacherToken}` },
        expectedStatus: 401,
        role: 'teacher',
        feature: 'RBAC API Authorization Guard',
      },
    ];

    for (const ep of testEndpoints) {
      total++;
      const start = Date.now();
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(ep.headers as Record<string, string>),
        };
        const res = await fetch(`${QA_CONFIG.APP_URL}${ep.url}`, {
          method: ep.method,
          headers,
        });

        const duration = Date.now() - start;
        const status = res.status;

        let responseBody: any = null;
        try {
          responseBody = await res.json();
        } catch {
          // Non-JSON
        }

        if (status === ep.expectedStatus) {
          passed++;
          await qaDb.recordTestResult({
            id: `res-${runId}-api-${ep.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
            run_id: runId,
            suite_name: 'API Automation Suite',
            test_name: ep.name,
            feature_name: ep.feature,
            role: ep.role,
            status: 'PASSED',
            duration_ms: duration,
            evidence: { status, durationMs: duration },
          });
        } else {
          throw new Error(`Expected HTTP ${ep.expectedStatus}, received HTTP ${status}`);
        }
      } catch (err: any) {
        failed++;
        const duration = Date.now() - start;
        await qaDb.recordTestResult({
          id: `res-${runId}-api-${ep.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
          run_id: runId,
          suite_name: 'API Automation Suite',
          test_name: ep.name,
          feature_name: ep.feature,
          role: ep.role,
          status: 'FAILED',
          duration_ms: duration,
          error_message: err.message,
        });

        await qaDb.recordFinding({
          id: `find-${runId}-api-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          run_id: runId,
          category: 'bug',
          severity: ep.expectedStatus === 401 ? 'HIGH' : 'MEDIUM',
          title: `Ketidaksesuaian Kontrak API pada ${ep.url}`,
          affected_feature: ep.feature,
          affected_role: ep.role,
          reproduction_steps: `Kirim permintaan HTTP ${ep.method} ke ${ep.url} dengan role ${ep.role}`,
          expected_behavior: `Menghasilkan HTTP Status ${ep.expectedStatus}`,
          actual_behavior: err.message,
          error_trace: err.stack,
          root_cause: `Handler rute API atau session validation mengembalikan kode status yang tidak sesuai kontrak`,
          root_cause_confidence: 80.0,
          recommended_fix: `Pastikan respons rute mengembalikan HTTP status ${ep.expectedStatus} saat syarat tidak terpenuhi`,
          status: 'OPEN',
        });
      }
    }

    return { total, passed, failed };
  }
}

export const apiRunner = new ApiRunner();
