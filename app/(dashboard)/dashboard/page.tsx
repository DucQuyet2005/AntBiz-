import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '../actions'
import { LogOut, LayoutDashboard, User, Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  
  // Lấy thông tin user hiện tại từ JWT Session được lưu trong cookies
  const { data: { user }, error } = await supabase.auth.getUser()

  // Bảo vệ route phía Server (nếu không có user thì chuyển về login)
  if (!user || error) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              A
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">AntBiz AI Publisher</span>
          </div>

          <form action={signout}>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back to your AI content hub.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                <User className="w-6 h-6" />
              </div>
              <h2 className="font-bold text-gray-950 text-lg">User Profile</h2>
              <p className="text-xs text-gray-500 mt-1">Logged in account details</p>
              <div className="mt-4 space-y-2">
                <div className="text-sm">
                  <span className="text-gray-400 block text-xs">Email Address</span>
                  <span className="font-semibold text-gray-800 break-all">{user.email}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-400 block text-xs">User ID</span>
                  <span className="font-mono text-xs text-gray-600">{user.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Status Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-gray-950 text-lg">System Status</h2>
            <p className="text-xs text-gray-500 mt-1">Database & API status</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Supabase Connection</span>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 font-semibold rounded text-xs border border-green-200">Active</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">JWT Authentication</span>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 font-semibold rounded text-xs border border-green-200">Secured</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="font-bold text-gray-950 text-lg">Next Steps</h2>
              <p className="text-xs text-gray-500 mt-1">Build AI and scheduling engines</p>
              <p className="text-sm text-gray-600 mt-4 leading-relaxed">
                Start by creating the Content Editor component, Google Gemini prompt generators, and the drag-and-drop Unified Calendar.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
