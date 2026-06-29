"use client";

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ShieldX, ChevronUp, RefreshCw, UserCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRef } from 'react';

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
  const [roleChangeData, setRoleChangeData] = useState<{ active: boolean; newRole: string }>({ active: false, newRole: '' });
  const { t, language } = useLanguage();
  const currentRoleRef = useRef<string | null>(null);

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

      // Initial status check against DB (also fetch locked_reason, role)
      const { data: profile } = await supabase
        .from('users')
        .select('status, locked_reason, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (!profile || profile.status === 'locked') {
        setLoading(false);
        showLockDialogThenLogout(profile?.locked_reason || t("dashboardLayout.defaultReason"));
        return;
      }

      currentRoleRef.current = profile.role;
      setLoading(false);

      // 🔴 Supabase Realtime: subscribe to changes on THIS user's row
      // Fires immediately when admin changes status to 'locked' or updates role
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
            const newRecord = payload.new as { status: string; locked_reason?: string; role?: string };
            if (newRecord.status === 'locked') {
              showLockDialogThenLogout(newRecord.locked_reason || t("dashboardLayout.defaultReason"));
              return;
            }
            // Nếu vai trò (role) thay đổi, hiển thị Popup và thực hiện reload
            if (newRecord.role && currentRoleRef.current && newRecord.role !== currentRoleRef.current) {
              setRoleChangeData({ active: true, newRole: newRecord.role });
              setTimeout(() => {
                window.location.reload();
              }, 2500);
            }
          }
        )
        .subscribe((status, err) => {
          if (status !== 'SUBSCRIBED') {
            console.warn(`Supabase Realtime subscription status for user-status-${user.id}:`, status, err);
          } else {
            console.log(`Supabase Realtime subscription active for user-status-${user.id}`);
          }
        });
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Close sidebar on pathname change (navigation)
    setIsSidebarOpen(false);
    setEditorSidebarHover(false);
  }, [pathname]);

  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const handleScroll = () => {
      if (mainEl.scrollTop > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    mainEl.addEventListener('scroll', handleScroll);
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, [loading]);

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            {/* Outer soft pulsing glow */}
            <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl animate-pulse scale-150"></div>
            {/* Logo container */}
            <div className="relative w-20 h-20 rounded-2xl bg-white p-3 flex items-center justify-center shadow-lg border border-slate-100 animate-pulse">
              <img
                src="/images/logo.png"
                alt="AntBiz Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <p className="text-sm font-semibold tracking-wide text-slate-500 bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-100/60 animate-pulse">
            {t("dashboardLayout.verifying")}
          </p>
        </div>
      </div>
    );
  }

  const getRoleLabel = (roleStr: string) => {
    if (roleStr === 'admin') return t("dashboardLayout.roleAdmin");
    if (roleStr === 'marketer_full') return t("dashboardLayout.roleMarketerFull");
    if (roleStr === 'marketer_content') return t("dashboardLayout.roleMarketerContent");
    return roleStr;
  };

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
                <h2 className="text-xl font-black text-gray-900 mb-1">{t("dashboardLayout.lockedTitle")}</h2>
                <p className="text-sm text-gray-500">{t("dashboardLayout.lockedSubtitle")}</p>
              </div>
              <div className="w-full bg-rose-50 border border-rose-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">{t("dashboardLayout.reasonLabel")}</p>
                <p className="text-sm text-rose-800 font-medium leading-relaxed">{lockedReason}</p>
              </div>
              <p className="text-xs text-gray-400">{t("dashboardLayout.lockedWarning")}</p>
              <button
                onClick={() => {
                  sessionStorage.setItem('logging_out', 'true');
                  supabase.auth.signOut().then(() => {
                    window.location.replace(`/login?error=locked&reason=${encodeURIComponent(lockedReason)}`);
                  });
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors text-sm focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {t("dashboardLayout.logoutBtn")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 Role Change Notification Overlay */}
      <AnimatePresence>
        {roleChangeData.active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-5 text-center border border-gray-100"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <UserCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-1">
                  {t("dashboardLayout.roleUpdatedTitle")}
                </h2>
                <p className="text-sm text-gray-500">
                  {t("dashboardLayout.roleUpdatedDesc")}
                </p>
              </div>
              <div className="w-full bg-emerald-50 border border-emerald-250/50 rounded-xl p-4 flex flex-col items-center gap-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  {t("dashboardLayout.newRoleLabel")}
                </span>
                <span className="text-sm font-black text-emerald-900 bg-emerald-100/60 px-3.5 py-1 rounded-full border border-emerald-200">
                  {getRoleLabel(roleChangeData.newRole)}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-gray-550 select-none">
                <RefreshCw size={13} className="animate-spin text-primary" />
                <span>
                  {t("dashboardLayout.preparingReload")}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {isLandingEditor ? (
      <>
          {/* ── LEFT SIDEBAR TRIGGER – D-shape pill + glow ── */}
          <div className="fixed top-0 bottom-0 left-0 w-10 hover:w-[280px] focus-within:w-[280px] z-[9999] group/sidebar transition-all duration-300 ease-out">
            <div className="absolute top-0 bottom-0 left-0 w-[280px] -translate-x-full group-hover/sidebar:translate-x-0 group-focus-within/sidebar:translate-x-0 transition-transform duration-300 ease-out shadow-2xl">
              <Sidebar isOpen={true} onClose={() => {}} />
            </div>
            {/* D-shape trigger tab */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 flex items-center pointer-events-none group-hover/sidebar:opacity-0 group-focus-within/sidebar:opacity-0 transition-opacity duration-200">
              {/* Glow */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-32 rounded-full"
                style={{
                  background: 'radial-gradient(ellipse at left, var(--color-primary) 0%, transparent 70%)',
                  filter: 'blur(14px)',
                  opacity: 0.65,
                }}
              />
              {/* Pill */}
              <div
                className="relative flex items-center justify-center h-14 w-8 rounded-r-full bg-primary shadow-lg shadow-primary/30"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          </div>

          {/* ── TOP HEADER TRIGGER & PANEL ── */}
          <div className="fixed top-0 left-0 right-0 h-0 z-[9998] group/header">
            {/* The actual header panel - slides down when group/header is hovered */}
            <div className="absolute top-0 left-0 right-0 -translate-y-full group-hover/header:translate-y-0 group-focus-within/header:translate-y-0 transition-transform duration-300 ease-out bg-white/95 backdrop-blur-md shadow-md px-4 sm:px-6 lg:px-10 flex items-center h-20">
              <div className="max-w-[1200px] w-full mx-auto">
                <Header onMenuClick={() => {}} />
              </div>
            </div>
            
            {/* Narrow Hover Zone around the arrow trigger */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-10 pointer-events-auto cursor-pointer flex flex-col items-center">
              {/* D-shape trigger tab */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none group-hover/header:opacity-0 transition-opacity duration-200">
                {/* Glow */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-14 rounded-full"
                  style={{
                    background: 'radial-gradient(ellipse at top, var(--color-primary) 0%, transparent 70%)',
                    filter: 'blur(14px)',
                    opacity: 0.65,
                  }}
                />
                {/* Pill */}
                <div
                  className="relative flex items-center justify-center w-16 h-8 rounded-b-full bg-primary shadow-lg shadow-primary/30"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
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

      <main 
        ref={mainRef}
        className={`flex-1 ${isLandingEditor ? 'ml-0' : 'lg:ml-[280px] ml-0'} overflow-y-auto flex flex-col min-w-0`}
        style={{ scrollBehavior: 'smooth' }}
      >
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

      {/* Floating Back to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-[60] bg-primary text-white p-3.5 rounded-full shadow-lg shadow-primary/20 cursor-pointer border-0 hover:bg-primary-hover transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            title={language === 'vi' ? 'Lên đầu trang' : 'Back to top'}
          >
            <ChevronUp size={18} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

