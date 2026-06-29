"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, EyeOff, Eye, ArrowRight, AlertCircle, CheckCircle2, ShieldAlert, ShieldX } from "lucide-react";
import { useState, useEffect } from "react";
import { login, signInWithGoogle, clearLoginAttempts } from "../actions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations/auth";
import { Toast, useToast } from "@/components/Toast";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LoginPage() {
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();
  const { t, language } = useLanguage();
  const [bannedReason, setBannedReason] = useState<string | null>(null);

  const getEmailErrorMessage = (message?: string) => {
    if (!message) return "";
    if (message === "Vui lòng nhập email") return t("login.emailRequired");
    if (message === "Định dạng email không hợp lệ") return t("login.emailInvalid");
    return message;
  };

  const getPasswordErrorMessage = (message?: string) => {
    if (!message) return "";
    if (message === "Vui lòng nhập mật khẩu") return t("login.passwordRequired");
    return message;
  };

  const getAuthErrorMessage = (errorMsg: string) => {
    if (!errorMsg) return "";
    const cleanMsg = errorMsg.toLowerCase();
    if (cleanMsg.includes("invalid login credentials") || cleanMsg.includes("thông tin đăng nhập không chính xác")) {
      return t("login.toastInvalidCredentials");
    }
    if (cleanMsg.includes("rate limit exceeded") || cleanMsg.includes("quá giới hạn")) {
      return t("login.toastEmailRateLimit");
    }
    return errorMsg;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("logging_out");
    }
    const checkLoggedUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.removeItem("login_attempts_count");
        localStorage.removeItem("login_matrix_locked");
        router.replace('/overview');
      }
    };
    checkLoggedUser();
  }, [router]);

  const [showPassword, setShowPassword] = useState(false);

  // Matrix challenge states
  const [isMatrixLocked, setIsMatrixLocked] = useState(false);
  const [matrixNumbers, setMatrixNumbers] = useState<number[]>([]);
  const [nextNumber, setNextNumber] = useState<number>(1);
  const [shakeMatrix, setShakeMatrix] = useState(false);
  const [matrixMessage, setMatrixMessage] = useState<string | null>(null);
  const [matrixMessageType, setMatrixMessageType] = useState<"success" | "error" | null>(null);

  const generateShuffledMatrix = () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setMatrixNumbers(arr);
    setNextNumber(1);
    setMatrixMessage(null);
    setMatrixMessageType(null);
  };

  const shakeVariants = {
    shake: {
      x: [0, -10, 10, -10, 10, -5, 5, 0],
      transition: { duration: 0.5 }
    },
    idle: { x: 0 }
  };

  const handleNumberClick = (num: number) => {
    if (num === nextNumber) {
      if (num === 9) {
        setNextNumber(10);
        setMatrixMessage(t("login.matrixSuccess"));
        setMatrixMessageType("success");
        
        // Clear server-side attempts and lockout cookies
        clearLoginAttempts().catch((err) => console.error("Error clearing login attempts:", err));

        setTimeout(() => {
          localStorage.removeItem("login_matrix_locked");
          localStorage.removeItem("login_attempts_count");
          setIsMatrixLocked(false);
          setNextNumber(1);
          setMatrixMessage(null);
          setMatrixMessageType(null);
        }, 1500);
      } else {
        setNextNumber(prev => prev + 1);
        setMatrixMessage(null);
        setMatrixMessageType(null);
      }
    } else {
      setMatrixMessage(t("login.matrixError"));
      setMatrixMessageType("error");
      setShakeMatrix(true);
      
      setTimeout(() => {
        setShakeMatrix(false);
      }, 500);
      
      setNextNumber(1);
      const arr = [...matrixNumbers];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setMatrixNumbers(arr);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const emailValue = watch("email");

  const isLockedOut = isMatrixLocked;

  useEffect(() => {
    const isLocked = localStorage.getItem("login_matrix_locked") === "true";
    if (isLocked) {
      setIsMatrixLocked(true);
      generateShuffledMatrix();
    }
  }, []);

  // Đọc mã lỗi từ URL search params và hiển thị thông báo lỗi
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      const resetParam = params.get("reset");
      let hasToastShown = false;
      
      if (errorParam === "no_profile") {
        showToast(t("login.toastNoProfile"), "error");
        hasToastShown = true;
      } else if (errorParam === "locked") {
        const reason = params.get("reason");
        setBannedReason(reason || t("dashboardLayout.defaultReason"));
        hasToastShown = true;
      } else if (errorParam) {
        showToast(errorParam === "Could not authenticate user" ? t("login.toastAuthFailed") : errorParam, "error");
        hasToastShown = true;
      }

      if (resetParam === "success") {
        showToast(t("login.toastResetSuccess"), "success");
        hasToastShown = true;
      }

      // Clear search params so they do not trigger the toast again on component re-renders
      if (hasToastShown) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [showToast, t]);



  const onSubmit = async (data: LoginInput) => {
    if (isLockedOut) return;
    hideToast();

    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);

    const result = await login(formData);

    if (result?.error) {
      // @ts-ignore
      if (result.isBanned) {
        // @ts-ignore
        setBannedReason(result.lockedReason || t("dashboardLayout.defaultReason"));
        return;
      }
      
      showToast(getAuthErrorMessage(result.error), "error");
      
      let attempts = parseInt(localStorage.getItem("login_attempts_count") || "0", 10);
      attempts += 1;
      
      // @ts-ignore
      if (result.isLockedOut || attempts >= 5) {
        localStorage.setItem("login_matrix_locked", "true");
        localStorage.setItem("login_attempts_count", "0");
        setIsMatrixLocked(true);
        generateShuffledMatrix();
      } else {
        localStorage.setItem("login_attempts_count", attempts.toString());
      }
    } else {
      localStorage.removeItem("login_matrix_locked");
      localStorage.removeItem("login_attempts_count");
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLockedOut) return;
    hideToast();
    const result = await signInWithGoogle();
    if (result?.error) {
      showToast(getAuthErrorMessage(result.error), "error");
    }
  };

  return (
    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
      </AnimatePresence>

      {/* 🔴 Account Locked Dialog Overlay */}
      <AnimatePresence>
        {bannedReason && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
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
                <p className="text-sm text-rose-800 font-medium leading-relaxed">{bannedReason}</p>
              </div>
              <p className="text-xs text-gray-400">{t("dashboardLayout.lockedWarning")}</p>
              <button
                onClick={() => setBannedReason(null)}
                type="button"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors text-sm focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {language === 'vi' ? 'Đã hiểu' : 'Got it'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Left Side - Image/Graphic */}
      <div className="hidden md:flex md:w-1/2 bg-[#3F40E8] p-3">
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex flex-col justify-end p-8 min-h-[600px]">
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">{t("login.title")}</h1>
        <p className="text-gray-500 text-sm mb-8">{t("login.subtitle")}</p>

        <div className="relative">

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">{t("login.emailLabel")}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register("email")}
                type="text"
                inputMode="email"
                autoComplete="email"
                placeholder={t("login.emailPlaceholder")}
                disabled={isLockedOut}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:outline-none transition-colors text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs font-medium pl-1 mt-1">
                {getEmailErrorMessage(errors.email.message)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">{t("login.passwordLabel")}</label>
              <Link
                href={emailValue ? `/forgot-password?email=${encodeURIComponent(emailValue)}` : "/forgot-password"}
                className="text-xs font-semibold text-primary hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded transition-colors"
              >
                {t("login.forgotPassword")}
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder={t("login.passwordPlaceholder")}
                disabled={isLockedOut}
                className="w-full pl-10 pr-10 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:outline-none transition-colors text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLockedOut}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs font-medium pl-1 mt-1">
                {getPasswordErrorMessage(errors.password.message)}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLockedOut}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {isLockedOut ? (language === 'vi' ? 'Đã bị khóa' : 'Locked') : isSubmitting ? t("login.submitting") : t("login.submitBtn")}
            {!isLockedOut && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <div className="mt-8 flex items-center">
          <div className="flex-1 border-t border-gray-200 dark:border-zinc-800"></div>
          <span className="px-4 text-xs text-gray-400 bg-white dark:bg-[#0F0F12]">{t("login.orContinueWith")}</span>
          <div className="flex-1 border-t border-gray-200 dark:border-zinc-800"></div>
        </div>

        <div className="mt-6">
          <button 
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLockedOut}
            className="w-full bg-[#F3F4F6] dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-slate-200 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2 focus-visible:outline-none"
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
            {t("login.googleBtn")}
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500 font-medium">
          {t("login.noAccount")}{" "}
          <Link href="/register" className="text-primary hover:text-primary-hover font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded">
            {t("login.registerLink")}
          </Link>
        </p>

        <AnimatePresence>
          {isMatrixLocked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -inset-2 z-40 flex flex-col items-center justify-center bg-white/98 dark:bg-[#0F0F12]/98 backdrop-blur-md p-6 rounded-2xl border border-gray-100/60 dark:border-white/5 shadow-xl text-center"
            >
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center mb-2">
                <ShieldAlert className="w-5 h-5" />
              </div>
              
              <h3 className="text-base font-bold text-gray-950 dark:text-slate-100 mb-0.5">{t("login.matrixTitle")}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-normal max-w-xs">{t("login.matrixSubtitle")}</p>

              {/* Matrix grid */}
              <motion.div
                variants={shakeVariants}
                animate={shakeMatrix ? "shake" : "idle"}
                className="grid grid-cols-3 gap-2 w-full my-3.5 max-w-[190px] aspect-square"
              >
                {matrixNumbers.map((num) => {
                  const isClicked = num < nextNumber;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumberClick(num)}
                      disabled={nextNumber > 9}
                      className={`h-12 w-12 text-base font-bold rounded-xl flex items-center justify-center transition-all select-none border focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none active:scale-95 ${
                        isClicked
                          ? "bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 shadow-inner scale-95"
                          : "bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-white/8 active:bg-gray-200 dark:active:bg-white/12 text-gray-800 dark:text-slate-200 border-gray-200/60 dark:border-white/5"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </motion.div>

              {/* Messages */}
              <div className="h-6 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {matrixMessage && (
                    <motion.div
                      key={matrixMessage}
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                        matrixMessageType === "success"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-red-50 text-red-500 border-red-100"
                      }`}
                    >
                      {matrixMessageType === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                      {matrixMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
  );
}
