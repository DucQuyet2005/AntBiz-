'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'

import { headers, cookies } from 'next/headers'
import { loginSchema, registerSchema } from '@/lib/validations/auth'

export async function login(formData: FormData) {
  const cookieStore = await cookies()
  const lockoutCookie = cookieStore.get('login_lockout')

  if (lockoutCookie) {
    return { error: 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 3 phút.', isLockedOut: true }
  }

  let email = formData.get('email') as string
  if (email && !email.includes('@')) {
    email = `${email}@gmail.com`
  }
  const password = formData.get('password') as string

  // Server-side validation
  const validatedFields = loginSchema.safeParse({ email, password })
  if (!validatedFields.success) {
    return { error: 'Dữ liệu gửi lên không hợp lệ.' }
  }

  const supabase = createClient()

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: validatedFields.data.email,
    password: validatedFields.data.password,
  })

  if (error) {
    let attempts = parseInt(cookieStore.get('login_attempts')?.value || '0', 10)
    attempts += 1

    if (attempts >= 5) {
      // Set lockout cookie for 3 minutes
      cookieStore.set('login_lockout', '1', {
        maxAge: 180,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      })
      cookieStore.delete('login_attempts')
      return { error: 'Bạn đã đăng nhập sai 5 lần. Tài khoản tạm thời bị khóa 3 phút.', isLockedOut: true }
    } else {
      cookieStore.set('login_attempts', attempts.toString(), {
        maxAge: 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      })
      return { error: error.message }
    }
  }

  // Sử dụng adminSupabase để bypass RLS (đặc biệt là policy update users chỉ cho phép admin)
  const adminSupabase = createAdminClient()

  // Kiểm tra xem profile có tồn tại trong bảng public.users không
  const { data: userProfile, error: profileError } = await adminSupabase
    .from('users')
    .select('status')
    .eq('id', signInData.user.id)
    .maybeSingle()

  if (profileError || !userProfile) {
    // Nếu chưa có profile trong public.users (tài khoản tạo trước khi chạy schema), tự động tạo/đồng bộ
    const { error: insertError } = await adminSupabase
      .from('users')
      .insert({
        id: signInData.user.id,
        email: signInData.user.email || '',
        role: 'marketer_content',
        status: 'active',
        last_login_at: new Date().toISOString()
      })

    if (insertError) {
      await supabase.auth.signOut()
      return { error: 'Không thể đồng bộ thông tin tài khoản. Vui lòng thử lại.' }
    }
  } else if (userProfile.status === 'locked') {
    await supabase.auth.signOut()
    return { error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' }
  } else {
    // Cập nhật đăng nhập cuối và kích hoạt tài khoản nếu đang ở trạng thái pending
    const updatePayload: any = { last_login_at: new Date().toISOString() }
    if (userProfile.status === 'pending') {
      updatePayload.status = 'active'
    }

    await adminSupabase
      .from('users')
      .update(updatePayload)
      .eq('id', signInData.user.id)
  }

  // Success: Clear lockout states
  cookieStore.delete('login_attempts')
  cookieStore.delete('login_lockout')

  // Supabase sẽ tự động set JWT Token vào Cookie. Middleware sẽ đọc JWT này để xác thực.
  redirect('/overview')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  // Server-side validation
  const validatedFields = registerSchema.safeParse({ email, password, fullName })
  if (!validatedFields.success) {
    return { error: 'Dữ liệu đăng ký không hợp lệ.' }
  }

  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Nếu cấu hình Supabase đã tắt "Confirm Email", nó sẽ trả về session đăng nhập ngay lập tức.
  // Chúng ta sẽ tự động chuyển hướng người dùng vào thẳng Dashboard.
  if (data?.session) {
    redirect('/overview')
  }

  return { success: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.' }
}

export async function signInWithGoogle() {
  const supabase = createClient()
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const origin = `${protocol}://${host}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/api/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url) // Chuyển hướng đến trang đăng nhập Google
  }
}

export async function clearLoginAttempts() {
  const cookieStore = await cookies()
  cookieStore.delete('login_attempts')
  cookieStore.delete('login_lockout')
}
