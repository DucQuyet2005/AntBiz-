"use client";

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (typeof window !== 'undefined' && sessionStorage.getItem('logging_out') === 'true') {
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/');
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, [router, supabase]);

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

