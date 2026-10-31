import { NextRequest, NextResponse } from 'next/server';
import { qaDb } from '@qa-engine/storage/db-client';
import { backgroundDaemon } from '@qa-engine/scheduler/BackgroundDaemon';
import { featureDiscovery } from '@qa-engine/core/FeatureDiscovery';

export async function GET(request: NextRequest) {
  try {
    const runs = await qaDb.getLatestRuns(15);
    const discovered = featureDiscovery.discoverAll();
    const daemonStatus = backgroundDaemon.getStatus();

    const latestRun = runs[0] || null;
    let runDetails: any = null;
    if (latestRun) {
      runDetails = await qaDb.getRunDetails(latestRun.id);
    }

    return NextResponse.json({
      success: true,
      latestRun,
      details: runDetails,
      history: runs,
      totalDiscoveredFeatures: discovered.length,
      daemonStatus,
    });
  } catch (err: any) {
    console.error('Error in QA API runs:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const suiteType = body.suiteType || 'smoke';

    // Masukkan ke antrian background daemon agar tidak memblokir server Next.js
    const job = backgroundDaemon.enqueueJob(suiteType);

    return NextResponse.json({
      success: true,
      message: `Audit suite '${suiteType}' berhasil dijadwalkan di background.`,
      job,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
