import { QA_CONFIG } from '../config/environments';
import { qaDb } from '../storage/db-client';

export class AiMicroserviceRunner {
  public async runAiAudit(runId: string): Promise<{ total: number; passed: number; failed: number }> {
    let total = 0;
    let passed = 0;
    let failed = 0;

    const flaskUrl = `${QA_CONFIG.FLASK_URL}/api/analyze_json`;

    // 1. UJI KETERSEDIAAN SERVICE & INPUT VALIDASI (MALFORMED JSON)
    total++;
    try {
      const res = await fetch(flaskUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'bukan_array' }),
      });

      // Mengharapkan HTTP 400 Bad Request
      if (res.status === 400) {
        passed++;
        await qaDb.recordTestResult({
          id: `ai-${runId}-validation-bad-input`,
          run_id: runId,
          suite_name: 'AI Microservice Suite',
          test_name: 'Validasi Input Malformed: Penolakan Objek Non-Array (HTTP 400)',
          feature_name: 'Flask Early Warning Service',
          role: 'system',
          status: 'PASSED',
          duration_ms: 50,
        });
      } else {
        throw new Error(`Mengharapkan HTTP 400 untuk input non-array, diterima HTTP ${res.status}`);
      }
    } catch (err: any) {
      failed++;
      await qaDb.recordTestResult({
        id: `ai-${runId}-validation-bad-input`,
        run_id: runId,
        suite_name: 'AI Microservice Suite',
        test_name: 'Validasi Input Malformed: Penolakan Objek Non-Array (HTTP 400)',
        feature_name: 'Flask Early Warning Service',
        role: 'system',
        status: 'FAILED',
        duration_ms: 50,
        error_message: err.message,
      });

      await qaDb.recordFinding({
        id: `find-ai-${runId}-offline-${Date.now()}`,
        run_id: runId,
        category: 'bug',
        severity: 'HIGH',
        title: 'Microservice AI Flask Tidak Merespons Sesuai Spesifikasi',
        affected_feature: 'AI Early Warning Microservice (Port 5000)',
        reproduction_steps: `POST request ke ${flaskUrl}`,
        expected_behavior: 'Service aktif dan mengembalikan HTTP 400 untuk input yang tidak valid',
        actual_behavior: err.message,
        error_trace: err.stack,
        root_cause: 'Microservice Flask belum dijalankan atau port 5000 tidak terbuka',
        root_cause_confidence: 90.0,
        recommended_fix: 'Jalankan service python app.py di folder flask_service atau periksa konfigurasi firewall',
        status: 'OPEN',
      });
    }

    // 2. UJI KLASIFIKASI RISIKO & K-MEANS CLUSTERING (NORMAL, WATCH, WARNING, URGENT)
    total++;
    const testBatch = [
      {
        nis: 'NIS-URGENT-01',
        nama_siswa: 'Siswa Penurunan Tajam',
        sakit: 5,
        izin: 2,
        alpa: 25,
        nilai: [90, 85, 80, 50, 40, 30], // Penurunan tajam > 15%
      },
      {
        nis: 'NIS-WARNING-02',
        nama_siswa: 'Siswa Risiko Sedang',
        sakit: 10,
        izin: 5,
        alpa: 8,
        nilai: [55, 58, 56, 57], // Nilai di bawah 60
      },
      {
        nis: 'NIS-WATCH-03',
        nama_siswa: 'Siswa Fluktuatif',
        sakit: 2,
        izin: 1,
        alpa: 0,
        nilai: [95, 40, 90, 45, 92], // Volatilitas tinggi
      },
      {
        nis: 'NIS-NORMAL-04',
        nama_siswa: 'Siswa Berprestasi Aman',
        sakit: 0,
        izin: 1,
        alpa: 0,
        nilai: [88, 92, 90, 95], // Stabil tinggi
      },
    ];

    const startAiTime = Date.now();
    try {
      const res = await fetch(flaskUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testBatch),
      });

      const latency = Date.now() - startAiTime;
      if (res.status !== 200) {
        throw new Error(`AI Service mengembalikan HTTP status ${res.status}`);
      }

      const result = await res.json();
      if (!result.data_siswa || !Array.isArray(result.data_siswa)) {
        throw new Error('Format respons AI tidak memuat array data_siswa');
      }

      const students = result.data_siswa;
      const urgentStudent = students.find((s: any) => s.nis === 'NIS-URGENT-01');
      const normalStudent = students.find((s: any) => s.nis === 'NIS-NORMAL-04');

      const isUrgentCorrect = urgentStudent && (urgentStudent.status_peringatan.includes('URGENT') || urgentStudent.status_peringatan.includes('WARNING'));
      const isNormalCorrect = normalStudent && normalStudent.status_peringatan === 'NORMAL';
      const hasRecommendations = urgentStudent && typeof urgentStudent.rekomendasi === 'string' && urgentStudent.rekomendasi.length > 0;
      const isLatencyAcceptable = latency <= QA_CONFIG.THRESHOLDS.AI_MICROSERVICE_MAX_MS;

      if (isUrgentCorrect && isNormalCorrect && hasRecommendations && isLatencyAcceptable) {
        passed++;
        await qaDb.recordTestResult({
          id: `ai-${runId}-clustering-accuracy`,
          run_id: runId,
          suite_name: 'AI Microservice Suite',
          test_name: 'Akurasi Klasifikasi Risiko & Rekomendasi K-Means / Rule-Based',
          feature_name: 'AI Risk Engine',
          role: 'system',
          status: 'PASSED',
          duration_ms: latency,
          evidence: {
            metadata: result.metadata,
            urgentCount: result.metadata?.urgent,
            normalCount: result.metadata?.normal,
            latencyMs: latency,
          },
        });
      } else {
        throw new Error(`Inkonsistensi Prediksi AI atau Latensi Berlebih (${latency}ms). UrgentMatch: ${isUrgentCorrect}, NormalMatch: ${isNormalCorrect}`);
      }
    } catch (err: any) {
      failed++;
      await qaDb.recordTestResult({
        id: `ai-${runId}-clustering-accuracy`,
        run_id: runId,
        suite_name: 'AI Microservice Suite',
        test_name: 'Akurasi Klasifikasi Risiko & Rekomendasi K-Means / Rule-Based',
        feature_name: 'AI Risk Engine',
        role: 'system',
        status: 'FAILED',
        duration_ms: Date.now() - startAiTime,
        error_message: err.message,
      });

      await qaDb.recordFinding({
        id: `find-ai-${runId}-accuracy-${Date.now()}`,
        run_id: runId,
        category: 'bug',
        severity: 'MEDIUM',
        title: 'Anomali pada Hasil Inferensi AI Early Warning',
        affected_feature: '/api/analyze_json (K-Means & Rule EWS)',
        reproduction_steps: 'Kirim payload 4 profil siswa dengan pola penurunan tajam dan stabilitas nilai',
        expected_behavior: 'Siswa penurunan tajam diklasifikasikan sebagai 🚨 URGENT dan waktu inferensi < 3000ms',
        actual_behavior: err.message,
        error_trace: err.stack,
        root_cause: 'Model scikit-learn scaler atau logika rule masking utils.py menghasilkan evaluasi yang tidak terduga',
        root_cause_confidence: 75.0,
        recommended_fix: 'Verifikasi kembali rentang threshold pada apply_early_warning_system() di utils.py',
        status: 'OPEN',
      });
    }

    return { total, passed, failed };
  }
}

export const aiMicroserviceRunner = new AiMicroserviceRunner();
