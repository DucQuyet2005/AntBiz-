"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, EyeOff, Eye, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, ResetPasswordInput } from "@/lib/validations/auth";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setSessionError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu một liên kết mới.");
        }
      } catch (err) {
        setSessionError("Không thể xác minh phiên làm việc.");
      } finally {
        setIsVerifyingSession(false);
      }
    }

    checkSession();
  }, []);

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Đã xảy ra lỗi khi đặt lại mật khẩu.");
      }

      // Đổi mật khẩu thành công -> Chuyển về trang đăng nhập với param reset=success
      router.push("/login?reset=success");
    } catch (err: any) {
      setServerError(err.message);
    }
  };

  if (isVerifyingSession) {
    return (
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-[#5A5CDE] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 text-sm">Đang xác thực yêu cầu...</p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8 text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Yêu cầu không hợp lệ</h3>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          {sessionError}
        </p>
        <Link
          href="/forgot-password"
          className="w-full bg-[#5A5CDE] hover:bg-[#4A4CBF] text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
        >
          Yêu cầu liên kết mới
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col md:flex-row">
      {/* Left Side - Image/Graphic */}
      <div className="hidden md:flex md:w-1/2 bg-[#3F40E8] p-3">
        <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden bg-black flex flex-col justify-end p-8 min-h-[600px]">
          <Image
            src="/images/login.png"
            alt="Bento Studio AI Dashboard"
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
              Where AI meets organized creativity. Build, generate, and
              orchestrate your content in a digital playground.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Đặt lại mật khẩu</h1>
        <p className="text-gray-500 text-sm mb-8">Thiết lập mật khẩu mới cho tài khoản của bạn</p>

        {serverError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Mật khẩu mới</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                disabled={isSubmitting}
                className="w-full pl-10 pr-10 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5CDE]/20 focus:border-[#5A5CDE] transition-colors text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs font-medium pl-1 mt-1">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register("confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                disabled={isSubmitting}
                className="w-full pl-10 pr-10 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5CDE]/20 focus:border-[#5A5CDE] transition-colors text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs font-medium pl-1 mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#5A5CDE] hover:bg-[#4A4CBF] text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
