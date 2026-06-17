"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, EyeOff, Eye, ArrowRight, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { login, signInWithGoogle } from "../actions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [lockoutTime, setLockoutTime] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const isLockedOut = lockoutTime > 0;

  useEffect(() => {
    const storedLockout = localStorage.getItem("login_lockout_until");
    if (storedLockout) {
      const remaining = Math.floor((parseInt(storedLockout) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutTime(remaining);
      } else {
        localStorage.removeItem("login_lockout_until");
        localStorage.removeItem("login_attempts_count");
      }
    }
  }, []);

  // Đọc mã lỗi từ URL search params và hiển thị thông báo lỗi
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (errorParam === "no_profile") {
        setServerError("Tài khoản của bạn chưa được đồng bộ dữ liệu hệ thống (Public Schema). Vui lòng đăng ký lại.");
      } else if (errorParam === "locked") {
        setServerError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
      } else if (errorParam) {
        setServerError(errorParam === "Could not authenticate user" ? "Xác thực thất bại. Vui lòng thử lại." : errorParam);
      }
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            localStorage.removeItem("login_lockout_until");
            localStorage.removeItem("login_attempts_count");
            setServerError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTime]);

  const onSubmit = async (data: LoginInput) => {
    if (isLockedOut) return;
    setServerError(null);

    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);

    const result = await login(formData);

    if (result?.error) {
      setServerError(result.error);
      
      let attempts = parseInt(localStorage.getItem("login_attempts_count") || "0", 10);
      attempts += 1;
      
      // @ts-ignore
      if (result.isLockedOut || attempts >= 5) {
        const lockoutUntil = Date.now() + 180 * 1000;
        localStorage.setItem("login_lockout_until", lockoutUntil.toString());
        localStorage.setItem("login_attempts_count", "0");
        setLockoutTime(180);
      } else {
        localStorage.setItem("login_attempts_count", attempts.toString());
      }
    } else {
      localStorage.removeItem("login_lockout_until");
      localStorage.removeItem("login_attempts_count");
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLockedOut) return;
    setServerError(null);
    const result = await signInWithGoogle();
    if (result?.error) {
      setServerError(result.error);
    }
  };

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
        <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Welcome Back</h1>
        <p className="text-gray-500 text-sm mb-8">Log in to your AI Creative Studio</p>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register("email")}
                type="email"
                placeholder="creator@example.com"
                disabled={isLockedOut}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs font-medium pl-1 mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">Password</label>
              <Link href="#" className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                disabled={isLockedOut}
                className="w-full pl-10 pr-10 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLockedOut}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs font-medium pl-1 mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLockedOut}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLockedOut ? `Vui lòng thử lại sau ${lockoutTime}s` : isSubmitting ? "Signing In..." : "Sign In"}
            {!isLockedOut && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <div className="mt-8 flex items-center">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-4 text-xs text-gray-400 bg-white">or continue with</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        <div className="mt-6">
          <button 
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLockedOut}
            className="w-full bg-[#F3F4F6] hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500 font-medium">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary hover:text-primary-hover font-semibold transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
