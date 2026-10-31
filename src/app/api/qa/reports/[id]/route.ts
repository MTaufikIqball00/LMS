import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { QA_CONFIG } from '@qa-engine/config/environments';
import { reportGenerator } from '@qa-engine/reporting/ReportGenerator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const format = request.nextUrl.searchParams.get('format') || 'json';
    const reportsDir = path.resolve(process.cwd(), QA_CONFIG.REPORTS_DIR);

    let filePath = path.join(reportsDir, `audit-report-${id}.json`);
    if (format === 'html') {
      filePath = path.join(reportsDir, `audit-report-${id}.html`);
    } else if (format === 'md') {
      filePath = path.join(reportsDir, `audit-report-${id}.md`);
    }

    // Jika file belum ada, coba generate ulang
    if (!fs.existsSync(filePath)) {
      await reportGenerator.generateFullAuditReport(id);
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf8');

    if (format === 'html') {
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } else if (format === 'md') {
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit-report-${id}.md"`,
        },
      });
    }

    return NextResponse.json(JSON.parse(content));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
