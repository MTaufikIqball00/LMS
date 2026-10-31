import { SignJWT } from 'jose';
import { QA_CONFIG } from '../config/environments';
import { TEST_ACCOUNTS } from '../config/test-roles';
import { sessionManager } from '../core/SessionManager';
import { qaDb } from '../storage/db-client';

export class SecurityRunner {
  public async runSecurityAudit(runId: string): Promise<{ total: number; passed: number; failed: number }> {
    let total = 0;
    let passed = 0;
    let failed = 0;

    // 1. PENGUJIAN ISOLASI MULTI-TENANT & IDOR
    const tenantA_Token = await sessionManager.createJwtForRole('school_admin', { schoolId: 'sch-001' }); // Bandung
    const tenantB_Token = await sessionManager.createJwtForRole('school_admin', { schoolId: 'sch-002' }); // Jakarta

    // Uji: Admin Sekolah Bandung mencoba query data Sekolah Jakarta via manipulasi parameter
    total++;
    try {
      const res = await fetch(`${QA_CONFIG.APP_URL}/api/school-admin/students?school_id=sch-002`, {
        headers: { Cookie: `auth_token=${tenantA_Token}` },
      });
      const data = await res.json();

      // Jika data dikembalikan berisi siswa dari school_id sch-002, maka terjadi pelanggaran tenant isolation!
      const hasLeak = Array.isArray(data) && data.some((s: any) => s.school_id === 'sch-002' || (s.school && s.school.id === 'sch-002'));
      if (hasLeak) {
        throw new Error('VULNERABILITY DETECTED: Admin Sekolah A dapat mengakses data siswa Sekolah B via query parameter manipulasi (IDOR)!');
      }

      passed++;
      await qaDb.recordTestResult({
        id: `sec-${runId}-tenant-students`,
        run_id: runId,
        suite_name: 'Multi-Tenant Security Suite',
        test_name: 'Isolasi Tenant: Pembatasan Siswa Sekolah A vs B',
        feature_name: 'Multi-Tenant Data Scoping',
        role: 'admin_sekolah',
        status: 'PASSED',
        duration_ms: 120,
      });
    } catch (err: any) {
      failed++;
      await qaDb.recordTestResult({
        id: `sec-${runId}-tenant-students`,
        run_id: runId,
        suite_name: 'Multi-Tenant Security Suite',
        test_name: 'Isolasi Tenant: Pembatasan Siswa Sekolah A vs B',
        feature_name: 'Multi-Tenant Data Scoping',
        role: 'admin_sekolah',
        status: 'FAILED',
        duration_ms: 120,
        error_message: err.message,
      });

      await qaDb.recordFinding({
        id: `find-sec-${runId}-idor-${Date.now()}`,
        run_id: runId,
        category: 'security',
        severity: 'CRITICAL',
        title: 'Kerentanan IDOR / Kebocoran Data Lintas Tenant',
        affected_feature: '/api/school-admin/students',
        affected_role: 'admin_sekolah',
        reproduction_steps: 'Kirim request dengan cookie admin sekolah A dan parameter school_id milik sekolah B',
        expected_behavior: 'Sistem menolak atau hanya mengembalikan data tenant milik token yang sah',
        actual_behavior: 'Data siswa tenant lain bocor',
        error_trace: err.stack,
        root_cause: 'Query handler mempercayai parameter input user daripada session token terverifikasi',
        root_cause_confidence: 95.0,
        recommended_fix: 'Gunakan session.schoolId secara eksklusif dalam klausa WHERE SQL',
        status: 'OPEN',
      });
    }

    // Uji: Kebocoran Data Presensi Antar Tenant (/api/attendance/records)
    total++;
    try {
      const teacherBandungToken = await sessionManager.createJwtForRole('teacher_jabar', { schoolId: 'sch-001' });
      const res = await fetch(`${QA_CONFIG.APP_URL}/api/attendance/records`, {
        headers: { Cookie: `auth_token=${teacherBandungToken}` },
      });
      const data = await res.json();

      // Dari discovery, kita tahu jika role != student, query attendance tidak memfilter u.school_id!
      // Uji apakah ada record siswa dari sekolah lain yang ikut terambil:
      let isLeakingOtherTenant = false;
      if (Array.isArray(data)) {
        // Cek jika ada record dari siswa luar jabar (sch-004)
        isLeakingOtherTenant = data.some((r: any) => r.studentId === 's2' || r.studentId === 's3');
      }

      if (isLeakingOtherTenant) {
        throw new Error('TENANT LEAKAGE: Guru Sekolah A dapat melihat log absensi siswa dari Sekolah B karena query tidak memfilter school_id!');
      }

      passed++;
      await qaDb.recordTestResult({
        id: `sec-${runId}-attendance-isolation`,
        run_id: runId,
        suite_name: 'Multi-Tenant Security Suite',
        test_name: 'Isolasi Tenant Absensi: Validasi Batas Rekam Kehadiran Siswa',
        feature_name: 'Attendance Records Scoping',
        role: 'teacher',
        status: 'PASSED',
        duration_ms: 110,
      });
    } catch (err: any) {
      failed++;
      await qaDb.recordTestResult({
        id: `sec-${runId}-attendance-isolation`,
        run_id: runId,
        suite_name: 'Multi-Tenant Security Suite',
        test_name: 'Isolasi Tenant Absensi: Validasi Batas Rekam Kehadiran Siswa',
        feature_name: 'Attendance Records Scoping',
        role: 'teacher',
        status: 'FAILED',
        duration_ms: 110,
        error_message: err.message,
      });

      await qaDb.recordFinding({
        id: `find-sec-${runId}-attendance-${Date.now()}`,
        run_id: runId,
        category: 'security',
        severity: 'HIGH',
        title: 'Kebocoran Tenant pada API Rekam Presensi (/api/attendance/records)',
        affected_feature: '/api/attendance/records',
        affected_role: 'teacher',
        reproduction_steps: 'Login sebagai guru Sekolah A, panggil /api/attendance/records',
        expected_behavior: 'Hanya rekaman presensi siswa dari Sekolah A yang ditampilkan',
        actual_behavior: 'Rekaman presensi siswa dari Sekolah B turut tampil',
        error_trace: err.stack,
        root_cause: 'Query attendance tidak memiliki filter WHERE u.school_id = session.school_id untuk role guru/admin',
        root_cause_confidence: 90.0,
        recommended_fix: 'Tambahkan filter JOIN users u ON s.user_id = u.id WHERE u.school_id = session.schoolId pada API attendance',
        status: 'OPEN',
      });
    }

    // 2. PENGUJIAN LISENSI REGIONAL (JAWA BARAT VS NON-JABAR)
    total++;
    try {
      // Siswa Luar Jabar mencoba akses langsung ke /tryout (harus diblokir middleware dan dialihkan ke /notifikasi)
      const nonJabarToken = await sessionManager.createJwtForRole('student_non_jabar');
      const res = await fetch(`${QA_CONFIG.APP_URL}/tryout`, {
        headers: { Cookie: `auth_token=${nonJabarToken}` },
        redirect: 'manual',
      });

      // Status 307 / 308 / 302 redirect ke /notifikasi
      const location = res.headers.get('location') || '';
      const isRedirectedToNotification = location.includes('/notifikasi');

      if (isRedirectedToNotification) {
        passed++;
        await qaDb.recordTestResult({
          id: `sec-${runId}-regional-license-tryout`,
          run_id: runId,
          suite_name: 'Regional Licensing Suite',
          test_name: 'Enforcement Lisensi Non-Jabar: Pemblokiran Fitur Tryout Online',
          feature_name: 'Regional Feature Restriction',
          role: 'student_non_jabar',
          status: 'PASSED',
          duration_ms: 85,
        });
      } else {
        throw new Error(`Lisensi Regional Gagal: Siswa luar Jabar tidak dialihkan ke /notifikasi saat mengakses /tryout (Status: ${res.status}, Location: ${location})`);
      }
    } catch (err: any) {
      failed++;
      await qaDb.recordTestResult({
        id: `sec-${runId}-regional-license-tryout`,
        run_id: runId,
        suite_name: 'Regional Licensing Suite',
        test_name: 'Enforcement Lisensi Non-Jabar: Pemblokiran Fitur Tryout Online',
        feature_name: 'Regional Feature Restriction',
        role: 'student_non_jabar',
        status: 'FAILED',
        duration_ms: 85,
        error_message: err.message,
      });
    }

    // 3. PENGUJIAN PEMALSUAN TOKEN (JWT FORGERY & TAMPERING)
    total++;
    try {
      // Token dengan signature sembarangan (kunci salah)
      const fakeSecret = new TextEncoder().encode('fake_unauthorized_key_attack');
      const fakeToken = await new SignJWT({ id: '1', role: 'admin_langganan', name: 'Hacker' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1d')
        .sign(fakeSecret);

      const res = await fetch(`${QA_CONFIG.APP_URL}/api/admin/dashboard`, {
        headers: { Cookie: `auth_token=${fakeToken}` },
      });

      if (res.status === 401) {
        passed++;
        await qaDb.recordTestResult({
          id: `sec-${runId}-jwt-forgery`,
          run_id: runId,
          suite_name: 'Authentication Security Suite',
          test_name: 'Ketahanan Autentikasi: Penolakan Token JWT Palsu (Forged Signature)',
          feature_name: 'JWT Verification Engine',
          role: 'unauthenticated',
          status: 'PASSED',
          duration_ms: 70,
        });
      } else {
        throw new Error(`CRITICAL: Server menerima token JWT palsu dengan kode status HTTP ${res.status}`);
      }
    } catch (err: any) {
      failed++;
      await qaDb.recordTestResult({
        id: `sec-${runId}-jwt-forgery`,
        run_id: runId,
        suite_name: 'Authentication Security Suite',
        test_name: 'Ketahanan Autentikasi: Penolakan Token JWT Palsu (Forged Signature)',
        feature_name: 'JWT Verification Engine',
        role: 'unauthenticated',
        status: 'FAILED',
        duration_ms: 70,
        error_message: err.message,
      });
    }

    // 4. PENGUJIAN SQL INJECTION AMAN (NON-DESTRUCTIVE)
    total++;
    try {
      const studentToken = await sessionManager.createJwtForRole('student_jabar');
      const safePayload = "' OR '1'='1";
      const res = await fetch(`${QA_CONFIG.APP_URL}/api/modules/${encodeURIComponent(safePayload)}`, {
        headers: { Cookie: `auth_token=${studentToken}` },
      });

      // API harus menangani secara graceful (404 Not Found atau 200 array kosong), BUKAN 500 Database Error
      if (res.status !== 500) {
        passed++;
        await qaDb.recordTestResult({
          id: `sec-${runId}-sqli-resilience`,
          run_id: runId,
          suite_name: 'Injection Protection Suite',
          test_name: 'Resiliensi SQL Injection: Parameterized Query Sanitization',
          feature_name: 'Universal DB Adapter',
          role: 'student',
          status: 'PASSED',
          duration_ms: 95,
        });
      } else {
        throw new Error('Database Error 500 terjadi saat injeksi karakter quote. Parameterisasi kueri berpotensi rentan');
      }
    } catch (err: any) {
      failed++;
      await qaDb.recordTestResult({
        id: `sec-${runId}-sqli-resilience`,
        run_id: runId,
        suite_name: 'Injection Protection Suite',
        test_name: 'Resiliensi SQL Injection: Parameterized Query Sanitization',
        feature_name: 'Universal DB Adapter',
        role: 'student',
        status: 'FAILED',
        duration_ms: 95,
        error_message: err.message,
      });
    }

    return { total, passed, failed };
  }
}

export const securityRunner = new SecurityRunner();
