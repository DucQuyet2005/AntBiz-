import { NextRequest, NextResponse } from 'next/server';
import { createAuditReportingModule } from '@/backend/modules/audit-reporting/audit-reporting-factory';
import {
  AuditReportingError,
  AuditReportingRepositoryError,
} from '@/backend/modules/audit-reporting/audit-reporting-errors';
import { requireUserWithRole } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const { supabase, unauthorized } = await requireUserWithRole(['admin']);
  if (unauthorized) return unauthorized;

  const searchParams = request.nextUrl.searchParams;
  try {
    const result = await createAuditReportingModule(supabase).list({
      action: searchParams.get('action'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuditReportingError) {
      return NextResponse.json({ error: error.clientMessage }, { status: error.status });
    }
    if (error instanceof AuditReportingRepositoryError) {
      console.error('[AuditReporting] Repository failure', {
        operation: error.operation,
        error: error.cause,
      });
    } else {
      console.error('[AuditReporting] Unexpected failure', error);
    }
    return NextResponse.json({ error: 'Không thể tải nhật ký hệ thống' }, { status: 500 });
  }
}
