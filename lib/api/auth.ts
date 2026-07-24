import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';

/**
 * Lấy Supabase server client + user hiện tại từ cookie session hoặc Authorization header.
 * Nếu chưa đăng nhập, trả về response 401 sẵn để route handler return ngay.
 *
 * Đây chỉ là lớp kiểm tra "có đăng nhập hay không" ở tầng API (giống @PreAuthorize cơ bản).
 * Phân quyền chi tiết (owner/admin được sửa/xóa gì) vẫn do RLS ở Supabase đảm nhiệm.
 */
export async function requireUser() {
  let supabase = null as any;
  let bearerToken: string | null = null;
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.substring(7).trim();
      supabase = createSupabaseJsClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      );
    }
  } catch (e) {
    // Fallback if headers context is missing
  }

  if (!supabase) {
    supabase = createClient();
  }

  let user = null;
  let authError = null;
  try {
    const { data, error } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();
    user = data?.user ?? null;
    authError = error;
  } catch (err: any) {
    authError = err;
  }

  if (authError || !user) {
    const isNetworkTimeout =
      authError?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      authError?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      authError?.name === 'ConnectTimeoutError' ||
      (authError?.message && (authError.message.includes('fetch failed') || authError.message.includes('Connect Timeout')));

    if (isNetworkTimeout) {
      return {
        supabase,
        user: null,
        unauthorized: NextResponse.json(
          { error: 'Không thể kết nối tới máy chủ Supabase (Connect Timeout). Vui lòng kiểm tra mạng hoặc trạng thái dự án Supabase.' },
          { status: 504 }
        ),
      } as const;
    }

    return {
      supabase,
      user: null,
      unauthorized: NextResponse.json(
        { error: 'Bạn cần đăng nhập để thực hiện hành động này' },
        { status: 401 }
      ),
    } as const;
  }

  return { supabase, user, unauthorized: null } as const;
}

/**
 * Yêu cầu người dùng đăng nhập và phải có role nằm trong danh sách được phép.
 * Trả về 401 nếu chưa đăng nhập, 403 nếu không đủ quyền.
 */
export async function requireUserWithRole(allowedRoles: ('admin' | 'marketer_full' | 'marketer_content')[]) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) {
    return { supabase, user: null, role: null, unauthorized };
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || !allowedRoles.includes(userData.role as any)) {
    return {
      supabase,
      user,
      role: userData?.role ?? null,
      unauthorized: NextResponse.json(
        { error: 'Bạn không có quyền thực hiện hành động này' },
        { status: 403 }
      ),
    };
  }

  return { supabase, user, role: userData.role as 'admin' | 'marketer_full' | 'marketer_content', unauthorized: null };
}

import { createHash } from 'crypto';

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NODE_ENV === 'test' ? 'test-secret-key' : undefined);
  if (!url || !serviceKey) {
    throw new Error('Thiếu cấu hình NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  }
  return createSupabaseJsClient(url, serviceKey);
}

export function getCalendarToken(userId: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NODE_ENV === 'test' ? 'test-secret-key' : undefined);
  if (!secret) {
    throw new Error('Thiếu cấu hình SUPABASE_SERVICE_ROLE_KEY để sinh Token Lịch');
  }
  return createHash('sha256').update(`cal-${userId}-${secret}`).digest('hex');
}
