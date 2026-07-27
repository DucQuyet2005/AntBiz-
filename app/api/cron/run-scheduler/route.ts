import { NextRequest, NextResponse } from 'next/server';
import { runSchedulerCycle } from '@/lib/scheduler/scheduler';

export const maxDuration = 60; // Cho phép API chạy tối đa 60s trên Vercel

export async function GET(request: NextRequest) {
  // Bảo mật: Chỉ cho phép Vercel Cron trigger hoặc gọi nội bộ
  const authHeader = request.headers.get('authorization');
  
  // Nếu có set CRON_SECRET trên Vercel thì bắt buộc phải match
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CRON_SECRET) {
      console.error('[Cron API] Thiếu cấu hình CRON_SECRET ở môi trường sản xuất.');
      return new NextResponse('Thiếu cấu hình CRON_SECRET trên máy chủ', { status: 500 });
    }
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  try {
    console.log('[Cron] Bắt đầu kích hoạt Scheduler đăng bài...');
    await runSchedulerCycle();
    return NextResponse.json({ success: true, message: 'Scheduler executed' });
  } catch (error: any) {
    console.error('[Cron] Lỗi chạy scheduler:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
