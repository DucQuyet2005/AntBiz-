import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateCaptionCSV, 
  createExportJob, 
  completeExportJob, 
  listExportJobs,
  notifyExportCompletion 
} from '@/lib/api/services/exportService';
import * as emailLib from '@/lib/email';

// Mock the email sending function
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe('exportService', () => {
  const mockSupabase: any = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for eq to return this (the builder)
    mockSupabase.eq.mockReturnThis();
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.update.mockReturnThis();
    mockSupabase.order.mockReturnThis();
    mockSupabase.limit.mockReturnThis();
  });

  describe('generateCaptionCSV', () => {
    it('should correctly map data to CSV format with UTF-8 BOM', () => {
      const mockData = [
        {
          id: '123',
          platform: 'facebook',
          ai_content: 'Test content with "quotes"',
          edited_content: 'Edited content, with comma',
          status: 'published',
          created_at: '2026-06-18T10:00:00Z',
          articles: { url: 'https://test.com', title: 'Test Title', category: 'Tech' },
          prompts: { name: 'Prompt 1', content: 'Do something' },
          users: { email: 'test@example.com' }
        }
      ];

      const csv = generateCaptionCSV(mockData);

      // Check BOM
      expect(csv.startsWith('\ufeff')).toBe(true);

      // Check headers
      const rows = csv.split('\n');
      expect(rows[0]).toContain('ID,Article URL,Article Title,Category,Platform,Prompt Name,Prompt Content,AI Content,Edited Content,Status,Created By,Created At');

      // Check escaped row
      const dataRow = rows[1];
      expect(dataRow).toContain('"123"');
      expect(dataRow).toContain('"https://test.com"');
      expect(dataRow).toContain('"Test Title"');
      expect(dataRow).toContain('"Test content with ""quotes"""');
      expect(dataRow).toContain('"Edited content, with comma"');
    });

    it('should handle empty fields gracefully', () => {
      const mockData = [
        {
          id: '124',
          platform: 'threads',
          status: 'draft',
          created_at: '2026-06-18T10:00:00Z',
          // Missing articles, prompts, users, etc.
        }
      ];

      const csv = generateCaptionCSV(mockData);
      const rows = csv.split('\n');
      const dataRow = rows[1];

      // Should have empty strings for missing relations (without BOM as it's on line 1)
      expect(dataRow).toBe('"124","","","","threads","","","","","draft","","2026-06-18T10:00:00Z"');
    });
  });

  describe('createExportJob', () => {
    it('should create an export_csv_job in audit_logs', async () => {
      const mockUserId = 'user-1';
      const mockFilters = { platform: 'facebook' };
      
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'job-1', action: 'export_csv_job' },
        error: null
      });

      const result = await createExportJob(mockSupabase, mockUserId, mockFilters);

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        actor_id: mockUserId,
        action: 'export_csv_job',
        after_value: expect.objectContaining({
          status: 'pending',
          filters: mockFilters
        })
      }));
      expect(result).toEqual({ id: 'job-1', action: 'export_csv_job' });
    });
  });

  describe('completeExportJob', () => {
    it('should update the job status and send an email', async () => {
      // Mock existing job fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: { after_value: { filters: { platform: 'blog' } } },
        error: null
      });

      // Mock update: 1st eq call returns this (for single), 2nd returns promise
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ error: null });

      await completeExportJob(
        mockSupabase, 
        'job-123', 
        'https://dl.test/file.csv', 
        50, 
        'user@example.com'
      );

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        after_value: expect.objectContaining({
          status: 'completed',
          download_url: 'https://dl.test/file.csv',
          row_count: 50,
          filters: { platform: 'blog' } // preserves existing data
        })
      }));

      expect(emailLib.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'user@example.com',
        subject: expect.stringContaining('sẵn sàng tải về'),
        html: expect.stringContaining('https://dl.test/file.csv')
      }));
    });
  });

  describe('listExportJobs', () => {
    it('should map audit_logs format back to ExportJob format', async () => {
      const mockAuditLogs = [
        {
          id: 'job-1',
          actor_id: 'user-1',
          created_at: '2026-06-18T10:00:00Z',
          after_value: {
            status: 'completed',
            download_url: 'https://test.com/dl.csv',
            row_count: 100
          }
        }
      ];

      mockSupabase.order.mockResolvedValueOnce({
        data: mockAuditLogs,
        error: null
      });

      const result = await listExportJobs(mockSupabase, 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'job-1',
        created_by: 'user-1',
        status: 'completed',
        download_url: 'https://test.com/dl.csv',
        error_message: undefined,
        filters: undefined,
        row_count: 100,
        created_at: '2026-06-18T10:00:00Z'
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockSupabase.eq).toHaveBeenCalledWith('action', 'export_csv_job');
    });
  });
});
