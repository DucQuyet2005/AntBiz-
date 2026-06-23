"use client";

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ShieldX } from 'lucide-react';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [lockedReason, setLockedReason] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const forceLogout = async (reason?: string) => {
      if (!isMounted) return;
      sessionStorage.setItem('logging_out', 'true');
      await supabase.auth.signOut();
      const reasonParam = reason ? `&reason=${encodeURIComponent(reason)}` : '';
      window.location.replace(`/login?error=locked${reasonParam}`);
    };

    const showLockDialogThenLogout = (reason: string) => {
      if (!isMounted) return;
      // Show dialog overlay immediately
      setLockedReason(reason);
      // Auto-redirect after 8 seconds if user doesn't click
      setTimeout(() => forceLogout(reason), 8000);
    };

    const initAuth = async () => {
      if (typeof window !== 'undefined' && sessionStorage.getItem('logging_out') === 'true') {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (!user) {
        window.location.replace('/');
        return;
      }

      // Initial status check against DB (also fetch locked_reason)
      const { data: profile } = await supabase
        .from('users')
        .select('status, locked_reason')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (!profile || profile.status === 'locked') {
        await forceLogout(profile?.locked_reason ?? undefined);
        return;
      }

      setLoading(false);

      // 🔴 Supabase Realtime: subscribe to changes on THIS user's row
      // Fires immediately when admin changes status to 'locked' — no polling needed
      realtimeChannel = supabase
        .channel(`user-status-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const newRecord = payload.new as { status: string; locked_reason?: string };
            if (newRecord.status === 'locked') {
              showLockDialogThenLogout(newRecord.locked_reason || 'Vi phạm chính sách sử dụng.');
            }
          }
        )
        .subscribe();
    };

    initAuth();

    return () => {
      isMounted = false;
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editorSidebarHover, setEditorSidebarHover] = useState(false);

  useEffect(() => {
    // Close sidebar on pathname change (navigation)
    setIsSidebarOpen(false);
    setEditorSidebarHover(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F5F9]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Đang xác thực tài khoản...</p>
        </div>
      </div>
    );
  }

  const isLandingEditor = pathname.includes('/admin/landing-editor');

  return (
    <div className="flex h-screen w-screen overflow-hidden relative">
      {/* 🔴 Account Locked Dialog Overlay */}
      <AnimatePresence>
        {lockedReason && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-5 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
                <ShieldX className="w-8 h-8 text-rose-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-1">Tài khoản bị khóa</h2>
                <p className="text-sm text-gray-500">Quản trị viên đã khóa tài khoản của bạn</p>
              </div>
              <div className="w-full bg-rose-50 border border-rose-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">Lý do</p>
                <p className="text-sm text-rose-800 font-medium leading-relaxed">{lockedReason}</p>
              </div>
              <p className="text-xs text-gray-400">Bạn sẽ được đăng xuất tự động sau vài giây. Vui lòng liên hệ quản trị viên để được hỗ trợ.</p>
              <button
                onClick={() => {
                  sessionStorage.setItem('logging_out', 'true');
                  supabase.auth.signOut().then(() => {
                    window.location.replace(`/login?error=locked&reason=${encodeURIComponent(lockedReason)}`);
                  });
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Đã hiểu, đăng xuất ngay
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {isLandingEditor ? (
        <>
          {/* Bulletproof CSS Hover Sidebar */}
          <div className="fixed top-0 bottom-0 left-0 w-4 hover:w-[280px] z-[9999] group/sidebar transition-all duration-300 ease-out">
            <div className="absolute top-0 bottom-0 left-0 w-[280px] -translate-x-full group-hover/sidebar:translate-x-0 transition-transform duration-300 ease-out shadow-2xl">
              <Sidebar isOpen={true} onClose={() => {}} />
            </div>
          </div>

          {/* Bulletproof CSS Hover Header */}
          <div className="fixed top-0 left-0 right-0 h-4 hover:h-20 z-[9998] group/header transition-all duration-300 ease-out">
            <div className="absolute top-0 left-0 right-0 -translate-y-full group-hover/header:translate-y-0 transition-transform duration-300 ease-out bg-white/95 backdrop-blur-md shadow-md px-4 sm:px-6 lg:px-10 flex items-center h-20">
              <div className="max-w-[1200px] w-full mx-auto">
                <Header onMenuClick={() => {}} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      )}
      
      {/* Backdrop for mobile */}
      <AnimatePresence>
        {!isLandingEditor && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      <main className={`flex-1 ${isLandingEditor ? 'ml-0' : 'lg:ml-[280px] ml-0'} overflow-y-auto flex flex-col min-w-0`}>
        <div className={`max-w-[1200px] w-full mx-auto ${isLandingEditor ? 'px-0' : 'px-4 sm:px-6 lg:px-10'} flex flex-col pb-12 grow shrink-0 min-h-screen`}>
          {!isLandingEditor && <Header onMenuClick={() => setIsSidebarOpen(true)} />}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full"
          >
            {children}
          </motion.div>
        </div>
        {!isLandingEditor && <Footer />}
      </main>
    </div>
  );
}

