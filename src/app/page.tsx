import { redirect } from 'next/navigation'

export default function RootPage() {
  // Tự động chuyển hướng từ trang chủ vào /dashboard
  // Middleware sẽ chặn lại và đẩy về /login nếu chưa có JWT session
  redirect('/dashboard')
}
