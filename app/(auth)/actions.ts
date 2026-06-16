'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Supabase sẽ tự động set JWT Token vào Cookie. Middleware sẽ đọc JWT này để xác thực.
  redirect('/')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const supabase = createClient()

  const { error } = await supabase.auth.signUp({
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

  // Đối với cấu hình mặc định của Supabase, người dùng cần click link xác nhận email.
  // Bạn có thể tắt tính năng "Confirm Email" trong Supabase Auth Settings để đăng nhập ngay lập tức.
  return { success: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.' }
}

export async function signInWithGoogle() {
  const supabase = createClient()
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const origin = `${protocol}://${host}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url) // Chuyển hướng đến trang đăng nhập Google
  }
}
