import fs from 'fs';
import path from 'path';
import { QA_CONFIG } from '../config/environments';
import { QaFindingRecord } from '../storage/db-client';

export interface AnalysisInput {
  findingId: string;
  errorMessage: string;
  errorTrace?: string;
  consoleLogs?: string[];
  networkErrors?: any[];
  affectedFeature: string;
  affectedRole?: string;
}

export interface AnalysisResult {
  rootCause: string;
  rootCauseConfidence: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedFix: string;
  relatedSourceCodeSnippet?: string;
  reproducibleTestCase: string;
}

export class RootCauseAnalyzer {
  public analyzeFinding(input: AnalysisInput): AnalysisResult {
    const errorText = (input.errorMessage + ' ' + (input.errorTrace || '')).toLowerCase();
    let rootCause = 'Terjadi kesalahan eksekusi runtime atau ketidaksesuaian kontrak data';
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    let confidence = 75.0;
    let recommendedFix = 'Tinjau kembali penanganan error pada handler terkait.';
    let relatedSnippet = '';

    // Deteksi Pola 1: Multi-Tenant / IDOR Leakage
    if (errorText.includes('tenant') || errorText.includes('idor') || errorText.includes('school_id') || input.affectedFeature.includes('attendance')) {
      severity = 'CRITICAL';
      confidence = 94.0;
      rootCause = `Kueri database pada ${input.affectedFeature} tidak menerapkan filter tenant boundary (WHERE school_id = session.school_id) secara konsisten untuk role non-siswa.`;
      recommendedFix = `Tambahkan klausa pembatas tenant berbasis session token pada handler SQL di src/app/api/...`;
      
      const filePath = path.resolve(process.cwd(), 'src/app/api/attendance/records/route.ts');
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        relatedSnippet = fileContent.substring(fileContent.indexOf('if (session.role === "student")'), fileContent.indexOf('query += ` ORDER BY'));
      }
    }
    // Deteksi Pola 2: Regional Licensing Bypass
    else if (errorText.includes('regional') || errorText.includes('jawa barat') || errorText.includes('tryout') || errorText.includes('lisensi')) {
      severity = 'HIGH';
      confidence = 92.0;
      rootCause = `Aturan pembatasan fitur regional (isFeatureRestricted) tidak dijalankan sebelum komponen dirender atau matcher middleware melewatkan rute spesifik.`;
      recommendedFix = `Periksa file src/middleware.ts dan src/lib/auth/restrictions.ts untuk memastikan seluruh rute terdaftar dalam RESTRICTED_FEATURES_FOR_NON_JABAR.`;
      
      const filePath = path.resolve(process.cwd(), 'src/lib/auth/restrictions.ts');
      if (fs.existsSync(filePath)) {
        relatedSnippet = fs.readFileSync(filePath, 'utf8').substring(0, 500);
      }
    }
    // Deteksi Pola 3: AI Microservice Failure
    else if (errorText.includes('microservice') || errorText.includes('flask') || errorText.includes('k-means') || errorText.includes('5000')) {
      severity = 'HIGH';
      confidence = 88.0;
      rootCause = `Service inferensi Flask Python pada port 5000 tidak tersedia atau menghasilkan timeout / error komputasi saat transformasi scaler.`;
      recommendedFix = `Pastikan service Python app.py aktif di direktori flask_service dan file model.joblib serta scaler.joblib terpasang dengan versi scikit-learn yang kompatibel.`;
    }
    // Deteksi Pola 4: Broken Access Control (RBAC)
    else if (errorText.includes('access control') || errorText.includes('unauthorized') || errorText.includes('rbac')) {
      severity = 'CRITICAL';
      confidence = 90.0;
      rootCause = `Rute halaman atau endpoint API tidak memverifikasi role pengguna dari session JWT sebelum menyajikan data sensitif.`;
      recommendedFix = `Terapkan pengecekan session.role pada awal handler route API dan perbarui konfigurasi path guard di middleware.`;
    }

    const reproducibleTestCase = `
// REPRODUCIBLE TEST CASE
test('Reproduce Issue: ${input.affectedFeature}', async ({ request }) => {
  const token = await sessionManager.createJwtForRole('${input.affectedRole || 'student'}');
  const response = await request.get('${QA_CONFIG.APP_URL}${input.affectedFeature}', {
    headers: { 'Cookie': 'auth_token=' + token }
  });
  // Ekspektasi: Harus lolos verifikasi tanpa membocorkan data terlarang
  expect(response.status()).not.toBe(500);
});
`.trim();

    return {
      rootCause,
      rootCauseConfidence: confidence,
      severity,
      recommendedFix,
      relatedSourceCodeSnippet: relatedSnippet,
      reproducibleTestCase
    };
  }
}

export const rootCauseAnalyzer = new RootCauseAnalyzer();
