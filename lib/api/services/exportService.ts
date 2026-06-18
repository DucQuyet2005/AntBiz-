import { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

export interface ExportFilters {
  search?: string;
  platform?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  error_message?: string;
  created_at: string;
}

/**
 * Sends an email notification when an export job is completed.
 */
export async function notifyExportCompletion(
  userEmail: string,
  downloadUrl: string,
  rowCount: number
) {
  const subject = '[AntBiz] Dữ liệu xuất bản đã sẵn sàng tải về';
  const text = `Xin chào,\n\nYêu cầu xuất dữ liệu (${rowCount} dòng) của bạn đã hoàn tất.\n\nBạn có thể tải về tệp CSV tại đây (link hết hạn sau 24h):\n${downloadUrl}\n\nTrân trọng,\nĐội ngũ AntBiz`;
  
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #10b981;">Xuất dữ liệu thành công!</h2>
      <p>Yêu cầu xuất <strong>${rowCount}</strong> dòng dữ liệu của bạn đã được xử lý xong.</p>
      <div style="margin: 30px 0;">
        <a href="${downloadUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Tải về file CSV</a>
      </div>
      <p style="font-size: 12px; color: #666;">Link tải này sẽ hết hạn sau 24 giờ.</p>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, text, html });
}

/**
 * Updates job status and optionally sends notification.
 */
export async function completeExportJob(
  supabase: SupabaseClient,
  jobId: string,
  downloadUrl: string,
  rowCount: number,
  userEmail?: string
) {
  // Get existing job to preserve other after_value fields
  const { data: existingJob } = await supabase
    .from('audit_logs')
    .select('after_value')
    .eq('id', jobId)
    .single();

  const currentValues = existingJob?.after_value || {};

  const { error } = await supabase
    .from('audit_logs')
    .update({
      after_value: {
        ...currentValues,
        status: 'completed',
        download_url: downloadUrl,
        row_count: rowCount,
        updated_at: new Date().toISOString()
      }
    })
    .eq('id', jobId);

  if (error) throw error;

  if (userEmail) {
    await notifyExportCompletion(userEmail, downloadUrl, rowCount);
  }
}

/**
 * Generates CSV content from caption data.
 * Handles escaping and UTF-8 BOM.
 */
export function generateCaptionCSV(data: any[]): string {
  const headers = [
    'ID',
    'Article URL',
    'Article Title',
    'Category',
    'Platform',
    'Prompt Name',
    'Prompt Content',
    'AI Content',
    'Edited Content',
    'Status',
    'Created By',
    'Created At'
  ];

  const rows = data.map(item => [
    item.id,
    item.articles?.url || '',
    item.articles?.title || '',
    item.articles?.category || '',
    item.platform,
    item.prompts?.name || '',
    item.prompts?.content || '',
    item.ai_content || '',
    item.edited_content || '',
    item.status,
    item.users?.email || '',
    item.created_at
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const escaped = String(cell).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(','))
  ].join('\n');

  // Add UTF-8 BOM for Excel compatibility
  return '\ufeff' + csvContent;
}

/**
 * Fetches captions with joined data for export.
 */
export async function getCaptionsForExport(
  supabase: SupabaseClient,
  filters: ExportFilters,
  limit = 1000
) {
  let query = supabase
    .from('captions')
    .select(`
      id,
      platform,
      ai_content,
      edited_content,
      status,
      created_at,
      articles (url, title, category),
      prompts (name, content),
      users (email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.platform && filters.platform !== 'All Platforms') {
    query = query.eq('platform', filters.platform.toLowerCase());
  }

  if (filters.search) {
    query = query.or(`ai_content.ilike.%${filters.search}%,edited_content.ilike.%${filters.search}%`);
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

/**
 * Creates an export job in the database.
 * Uses audit_logs table since we cannot execute DDL for export_jobs via REST.
 */
export async function createExportJob(
  supabase: SupabaseClient,
  userId: string,
  filters: ExportFilters
) {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      actor_id: userId,
      action: 'export_csv_job',
      after_value: {
        status: 'pending',
        filters,
        created_at: new Date().toISOString()
      }
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Lists export jobs for a user.
 */
export async function listExportJobs(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('actor_id', userId)
    .eq('action', 'export_csv_job')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Format back to ExportJob shape
  return data.map(job => ({
    id: job.id,
    created_by: job.actor_id,
    status: job.after_value?.status || 'pending',
    download_url: job.after_value?.download_url,
    error_message: job.after_value?.error_message,
    filters: job.after_value?.filters,
    row_count: job.after_value?.row_count,
    created_at: job.created_at
  }));
}
