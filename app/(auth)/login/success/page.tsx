'use client'

import { useEffect } from 'react'

export default function LoginSuccessPage() {
  useEffect(() => {
    // Đợi 1.5 giây để người dùng nhìn thấy thông báo rồi tự động đóng tab
    const timer = setTimeout(() => {
      window.close()
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-gray-100 dark:border-gray-700">
        <div className="text-emerald-500 text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Đăng nhập thành công!</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Tiện ích AntBiz Assistant đã kết nối thành công. Trình duyệt sẽ tự động đóng tab này sau giây lát...
        </p>
        <button 
          onClick={() => window.close()} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-all"
        >
          Đóng tab ngay
        </button>
      </div>
    </div>
  )
}
