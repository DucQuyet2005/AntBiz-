import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/captions/export/route';
import { NextRequest } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import * as exportService from '@/lib/api/services/exportService';

vi.mock('@/lib/api/auth', () => ({
  requireUserWithRole: vi.fn(),
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    update: vi.fn().mockReturnThis(),
  })),
}));

vi.mock('@/lib/api/services/exportService', () => ({
  getCaptionsForExport: vi.fn(),
  generateCaptionCSV: vi.fn(),
  createExportJob: vi.fn(),
  completeExportJob: vi.fn(),
}));

describe('GET /api/captions/export', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for count
    (mockSupabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ count: 100, error: null }),
    });
  });

  it('should return 403 if user is not authorized', async () => {
    (requireUserWithRole as any).mockResolvedValue({
      unauthorized: { status: 403 },
    });

    const req = new NextRequest('http://localhost/api/captions/export');
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it('should process the job synchronously and return 200', async () => {
    (requireUserWithRole as any).mockResolvedValue({
      user: mockUser,
      supabase: mockSupabase,
      unauthorized: null,
    });

    (exportService.createExportJob as any).mockResolvedValue({ id: 'job-abc' });
    (exportService.getCaptionsForExport as any).mockResolvedValue([{ id: 1 }]);

    const req = new NextRequest('http://localhost/api/captions/export');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.job_id).toBe('job-abc');
    expect(json.message).toContain('Đã hoàn thành xuất dữ liệu');
    expect(exportService.createExportJob).toHaveBeenCalled();
    expect(exportService.completeExportJob).toHaveBeenCalled();
  });
});
