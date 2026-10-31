import { qaOrchestrator } from '../index';
import { qaDb } from '../storage/db-client';

export interface QaJob {
  id: string;
  suiteType: 'smoke' | 'full_regression' | 'security' | 'performance' | 'ai_microservice' | 'multi_role';
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  retries: number;
  maxRetries: number;
  timeoutMs: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class BackgroundDaemon {
  private queue: QaJob[] = [];
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Menambahkan tugas audit ke antrian eksekusi background
   */
  public enqueueJob(
    suiteType: QaJob['suiteType'],
    options: { maxRetries?: number; timeoutMs?: number } = {}
  ): QaJob {
    const job: QaJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      suiteType,
      status: 'QUEUED',
      retries: 0,
      maxRetries: options.maxRetries ?? 2,
      timeoutMs: options.timeoutMs ?? 180000, // 3 Menit default timeout
      createdAt: new Date(),
    };

    this.queue.push(job);
    console.log(`📥 [QA DAEMON] Job ditambahkan ke antrian: ${job.id} (${job.suiteType})`);
    
    // Picu proses jika belum berjalan
    this.processNextJob();
    return job;
  }

  /**
   * Memulai daemon penjadwalan periodik di background
   */
  public start(pollIntervalMs = 60000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`🕒 [QA DAEMON] Background testing service diaktifkan (interval: ${pollIntervalMs}ms)`);

    this.timer = setInterval(async () => {
      await this.checkSchedules();
      this.processNextJob();
    }, pollIntervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log(`🛑 [QA DAEMON] Background testing service dinonaktifkan.`);
  }

  private async checkSchedules() {
    try {
      const activeSchedules = await qaDb.getActiveSchedules();
      const now = new Date();

      for (const sched of activeSchedules) {
        // Cek apakah sudah waktunya eksekusi sederhana (misal interval menit)
        if (!sched.last_run || (now.getTime() - new Date(sched.last_run).getTime()) > 30 * 60 * 1000) {
          console.log(`⏰ [QA SCHEDULER] Menjalankan jadwal terjadwal: ${sched.name} (${sched.suite_type})`);
          this.enqueueJob(sched.suite_type as any);
        }
      }
    } catch (err) {
      console.warn('⚠️ Gagal memeriksa jadwal QA:', err);
    }
  }

  private async processNextJob() {
    if (this.isProcessing) return;
    const nextJob = this.queue.find((j) => j.status === 'QUEUED');
    if (!nextJob) return;

    this.isProcessing = true;
    nextJob.status = 'RUNNING';
    nextJob.startedAt = new Date();

    console.log(`▶️ [QA DAEMON] Memulai eksekusi job: ${nextJob.id} [${nextJob.suiteType}]`);

    try {
      // Jalankan orchestrator dengan timeout guard
      await Promise.race([
        qaOrchestrator.executeSuite(nextJob.suiteType),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout: Job melampaui batas waktu ${nextJob.timeoutMs}ms`)), nextJob.timeoutMs)
        ),
      ]);

      nextJob.status = 'COMPLETED';
      nextJob.completedAt = new Date();
      console.log(`✅ [QA DAEMON] Job selesai dengan sukses: ${nextJob.id}`);
    } catch (err: any) {
      console.error(`❌ [QA DAEMON] Kegagalan pada job ${nextJob.id}:`, err.message);
      if (nextJob.retries < nextJob.maxRetries) {
        nextJob.retries++;
        nextJob.status = 'QUEUED';
        console.log(`🔄 [QA DAEMON] Mencoba ulang job ${nextJob.id} (Percobaan ke-${nextJob.retries}/${nextJob.maxRetries})...`);
      } else {
        nextJob.status = 'FAILED';
        nextJob.completedAt = new Date();
        nextJob.error = err.message;
      }
    } finally {
      this.isProcessing = false;
      // Lanjutkan ke job berikutnya jika ada antrian
      setTimeout(() => this.processNextJob(), 2000);
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
      queuedJobsCount: this.queue.filter((j) => j.status === 'QUEUED').length,
      history: this.queue.slice(-20),
    };
  }
}

export const backgroundDaemon = new BackgroundDaemon();

// Start jika dijalankan langsung sebagai worker proses
if (require.main === module) {
  backgroundDaemon.start(30000);
}
