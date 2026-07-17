"use client";

import { useEffect, useState, useCallback, createContext, useContext, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, X, Info, ExternalLink } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useLanguage } from "@/contexts/LanguageContext";

export type ToastType = "success" | "error" | "info";

export interface ToastInfo {
  id: string;
  message: string;
  type: ToastType;
  link?: string;
}

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  link?: string;
  onClose: () => void;
}

const ToastContext = createContext<{
  toasts: ToastInfo[];
  showToast: (message: string, type?: ToastType, link?: string) => void;
  hideToast: (id?: string) => void;
} | null>(null);

export function Toast({ message, type = "success", duration = 5000, link, onClose }: ToastProps) {
  const [hovered, setHovered] = useState(false);
  const startTimeRef = useRef(0);
  const timeLeftRef = useRef(duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hovered) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        onClose();
      }, timeLeftRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (!hovered) {
        const elapsed = Date.now() - startTimeRef.current;
        timeLeftRef.current = Math.max(0, timeLeftRef.current - elapsed);
      }
    };
  }, [hovered, onClose]);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
  };

  const bgColors = {
    success: "bg-white dark:bg-zinc-900 border-emerald-100 dark:border-emerald-950/60 shadow-emerald-500/5",
    error: "bg-white dark:bg-zinc-900 border-rose-100 dark:border-rose-950/60 shadow-rose-500/5",
    info: "bg-white dark:bg-zinc-900 border-blue-100 dark:border-blue-950/60 shadow-blue-500/5",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-start gap-3.5 px-4.5 py-4 rounded-2xl border shadow-xl max-w-sm w-full select-none pointer-events-auto transition-shadow hover:shadow-2xl ${bgColors[type]}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-grow min-w-0">
        <p className="text-xs font-bold text-gray-800 dark:text-slate-200 leading-relaxed pr-1">
          {message}
        </p>
        {link && (
          <a
            href={link}
            className="text-[10px] font-black text-primary hover:underline mt-2 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Xem chi tiết</span>
            <ExternalLink size={10} />
          </a>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded p-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const supabase = createClient();

  const showToast = useCallback((message: string, type: ToastType = "success", link?: string) => {
    setToasts((prev) => {
      const next = [...prev, { id: Math.random().toString(), message, type, link }];
      return next.slice(-3); // Keep maximum 3 toasts
    });
  }, []);

  const hideToast = useCallback((id?: string) => {
    setToasts((prev) => (id ? prev.filter((t) => t.id !== id) : []));
  }, []);

  // Set up real-time postgres changes listener for notifications table
  useEffect(() => {
    let active = true;
    let realtimeChannel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user || !active) return;

        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }

        realtimeChannel = supabase
          .channel(`toast-notifications-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload: { new: Record<string, unknown> }) => {
              const newNotif = payload.new;
              if (newNotif && active) {
                const notifType = newNotif.type as string;
                const notifMessage = newNotif.message as string;
                let link: string | undefined;
                if (notifType === "post_failed") {
                  link = "/notifications";
                }
                
                let toastType: ToastType = "info";
                if (notifType === "post_success") toastType = "success";
                else if (notifType === "post_failed") toastType = "error";

                showToast(notifMessage, toastType, link);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn("Error setting up Realtime in ToastProvider:", err);
      }
    };

    setupRealtime();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setupRealtime();
      } else if (event === "SIGNED_OUT") {
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [supabase, showToast]);

  const bufferRef = useRef("");
  const isTogglingRef = useRef(false);
  const { language } = useLanguage();

  // Easteregg: Type "anhdomixi" 3 times (27 characters) to toggle role
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target && 
        (target.tagName === 'INPUT' || 
         target.tagName === 'TEXTAREA' || 
         target.tagName === 'SELECT' || 
         target.isContentEditable)
      ) {
        return;
      }

      if (e.key && e.key.length === 1) {
        bufferRef.current += e.key.toLowerCase();
        if (bufferRef.current.length > 27) {
          bufferRef.current = bufferRef.current.slice(-27);
        }

        if (bufferRef.current.endsWith("anhdomixianhdomixianhdomixi")) {
          bufferRef.current = "";
          if (isTogglingRef.current) return;
          isTogglingRef.current = true;

          showToast(
            language === 'vi' 
              ? "Kích hoạt Easter Egg! Đang chuyển đổi vai trò tài khoản..." 
              : "Easter Egg activated! Toggling account role...",
            "info"
          );

          try {
            const res = await fetch("/api/auth/easteregg", {
              method: "POST",
              headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
              const data = await res.json();
              showToast(
                language === 'vi'
                  ? `Chuyển đổi thành công sang vai trò: ${data.role === 'admin' ? 'Admin' : 'Marketer'}. Đang chuyển hướng...`
                  : `Successfully toggled to: ${data.role === 'admin' ? 'Admin' : 'Marketer'}. Redirecting...`,
                "success"
              );
              setTimeout(() => {
                window.location.href = "/overview";
              }, 1500);
            } else {
              const err = await res.json().catch(() => ({}));
              showToast(
                language === 'vi'
                  ? `Lỗi: ${err.error || 'Không thể chuyển đổi vai trò'}`
                  : `Error: ${err.error || 'Failed to toggle role'}`,
                "error"
              );
              isTogglingRef.current = false;
            }
          } catch (error) {
            console.error("Easteregg toggle failed:", error);
            showToast(
              language === 'vi' ? "Lỗi kết nối mạng" : "Network connection error",
              "error"
            );
            isTogglingRef.current = false;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [language, showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none select-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              message={t.message}
              type={t.type}
              link={t.link}
              onClose={() => hideToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  const [localToasts, setLocalToasts] = useState<ToastInfo[]>([]);

  if (context) {
    return {
      toasts: context.toasts,
      toast: context.toasts[context.toasts.length - 1] || null,
      showToast: context.showToast,
      hideToast: context.hideToast,
    };
  }

  // Local fallback logic
  const showToast = (message: string, type: ToastType = "success", link?: string) => {
    setLocalToasts((prev) => {
      const next = [...prev, { id: Math.random().toString(), message, type, link }];
      return next.slice(-3);
    });
  };

  const hideToast = (id?: string) => {
    setLocalToasts((prev) => (id ? prev.filter((t) => t.id !== id) : []));
  };

  return {
    toasts: localToasts,
    toast: localToasts[localToasts.length - 1] || null,
    showToast,
    hideToast,
  };
}
