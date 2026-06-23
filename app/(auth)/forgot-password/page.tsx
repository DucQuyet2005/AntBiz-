"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, ForgotPasswordInput } from "@/lib/validations/auth";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Toast, useToast } from "@/components/Toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { AnimatePresence } from "framer-motion";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { t } = useLanguage();

  const getEmailErrorMessage = (message?: string) => {
    if (!message) return "";
    if (message === "Vui lòng nhập email") return t("forgotPassword.emailRequired");
    if (message === "Định dạng email không hợp lệ") return t("forgotPassword.emailInvalid");
    return message;
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  useEffect(() => {
    const supabase = createClient();
    const authChannel = new BroadcastChannel('auth_flow');
    
    // Lắng nghe tín hiệu từ tab mới
    authChannel.onmessage = (event) => {
      if (event.data === 'CLOSE_FORGOT_PASSWORD') {
        window.close();
        // Nếu trình duyệt chặn window.close(), hiển thị thông báo thay thế
        showToast(t("forgotPassword.toastProcessingTab"), "info");
      }
    };
    
    // Lắng nghe sự thay đổi trạng thái đăng nhập
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Thay vì redirect ngay, ta thử đóng tab trước
        window.close();
        router.push("/reset-password");
      }
    });

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      if (emailParam) {
        setValue("email", emailParam);
      }
    }

    return () => {
      subscription.unsubscribe();
      authChannel.close();
    };
  }, [setValue, router, showToast]);

  const onSubmit = async (data: ForgotPasswordInput) => {
    hideToast();
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("forgotPassword.toastError"));
      }

      setSuccessMessage(result.message || t("forgotPassword.successDesc"));
      showToast(t("forgotPassword.toastSuccess"), "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col md:flex-row">
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
      </AnimatePresence>
      {/* Left Side - Image/Graphic */}
      <div className="hidden md:flex md:w-1/2 bg-[#3F40E8] p-3">
        <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden bg-black flex flex-col justify-end p-8 min-h-[600px]">
          <Image
            src="/images/login.png"
            alt={t("login.altText")}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover opacity-80"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C121E] via-transparent to-transparent"></div>
          
          <div className="relative z-10 bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl w-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-[#3F40E8] font-bold text-xs">
                <div className="w-3 h-3 border-2 border-current rounded-sm"></div>
              </div>
              <span className="text-white font-semibold text-lg">Bento Studio</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed text-balance">
              {t("login.leftDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center">
        <Link href="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-[#5A5CDE] transition-colors mb-8 group w-fit">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          {t("forgotPassword.backToLogin")}
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">{t("forgotPassword.title")}</h1>
        <p className="text-gray-500 text-sm mb-8">{t("forgotPassword.subtitle")}</p>

        {successMessage ? (
          <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t("forgotPassword.successTitle")}</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              {t("forgotPassword.successDesc")}
            </p>
            <Link
              href="/login"
              className="w-full bg-[#5A5CDE] hover:bg-[#4A4CBF] text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
            >
              {t("forgotPassword.backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">{t("forgotPassword.emailLabel")}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  {...register("email")}
                  type="email"
                  placeholder={t("forgotPassword.emailPlaceholder")}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5CDE]/20 focus:border-[#5A5CDE] transition-colors text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs font-medium pl-1 mt-1">
                  {getEmailErrorMessage(errors.email.message)}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#5A5CDE] hover:bg-[#4A4CBF] text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t("forgotPassword.submitting") : t("forgotPassword.submitBtn")}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
