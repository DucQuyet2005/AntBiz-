"use client";

import Link from "next/link";
import Image from "next/image";
import { User, Mail, Lock, EyeOff, Eye, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { signup } from "../actions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/validations/auth";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RegisterPage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  const getFullNameErrorMessage = (message?: string) => {
    if (!message) return "";
    if (message === "Họ và tên phải có ít nhất 2 ký tự") return t("register.fullNameMinError");
    if (message === "Họ và tên không được quá 50 ký tự") return t("register.fullNameMaxError");
    return message;
  };

  const getEmailErrorMessage = (message?: string) => {
    if (!message) return "";
    if (message === "Vui lòng nhập email") return t("register.emailRequired");
    if (message === "Định dạng email không hợp lệ") return t("register.emailInvalid");
    return message;
  };

  const getPasswordErrorMessage = (message?: string) => {
    if (!message) return "";
    if (message === "Mật khẩu phải chứa ít nhất 8 ký tự") return t("register.passwordMinError");
    if (message === "Mật khẩu phải chứa ít nhất 1 chữ hoa") return t("register.passwordUpperError");
    if (message === "Mật khẩu phải chứa ít nhất 1 chữ thường") return t("register.passwordLowerError");
    if (message === "Mật khẩu phải chứa ít nhất 1 chữ số") return t("register.passwordNumberError");
    return message;
  };

  const getAuthErrorMessage = (errorMsg: string) => {
    if (!errorMsg) return "";
    const cleanMsg = errorMsg.toLowerCase();
    if (cleanMsg.includes("user already registered") || cleanMsg.includes("email này đã được đăng ký")) {
      return t("register.toastUserExists");
    }
    if (cleanMsg.includes("rate limit exceeded") || cleanMsg.includes("quá giới hạn")) {
      return t("register.toastEmailRateLimit");
    }
    return errorMsg;
  };

  const getSuccessMessage = (successMsg: string) => {
    if (!successMsg) return "";
    if (successMsg.includes("Đăng ký thành công") || successMsg.includes("Registration successful")) {
      return language === 'en'
        ? "Registration successful! Please check your email to verify your account."
        : "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.";
    }
    return successMsg;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("logging_out");
    }
    const checkLoggedUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace('/overview');
      }
    };
    checkLoggedUser();
  }, [router]);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("fullName", data.fullName);
    formData.append("email", data.email);
    formData.append("password", data.password);

    const result = await signup(formData);

    if (result?.error) {
      setServerError(getAuthErrorMessage(result.error));
    } else if (result?.success) {
      setSuccess(getSuccessMessage(result.success));
    }
  };

  return (
    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
      {/* Left Side - Image/Graphic */}
      <div className="hidden md:flex md:w-1/2 bg-[#0C121E] p-3">
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-b from-[#111A2A] to-[#080B12] flex items-center justify-center min-h-[600px] shadow-inner border border-white/5">
          <Image
            src="/images/register.png"
            alt={t("register.altText")}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover opacity-90 mix-blend-screen"
            priority
          />
          <div className="absolute top-6 left-6 z-20">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <div className="w-4 h-4 text-[#3F40E8] flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-current rounded-sm"></div>
              </div>
              <span className="text-gray-900 font-bold text-xs">Bento Studio</span>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#0C121E] to-transparent z-10"></div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">{t("register.title")}</h1>
        <p className="text-gray-500 text-sm mb-8">{t("register.subtitle")}</p>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-emerald-950/20 border border-green-200 dark:border-emerald-900/30 text-green-600 dark:text-emerald-450 rounded-xl text-sm font-medium flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">{t("register.fullNameLabel")}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register("fullName")}
                type="text"
                placeholder={t("register.fullNamePlaceholder")}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:outline-none transition-colors text-gray-900"
              />
            </div>
            {errors.fullName && (
              <p className="text-red-500 text-xs font-medium pl-1 mt-1">
                {getFullNameErrorMessage(errors.fullName.message)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">{t("register.emailLabel")}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register("email")}
                type="email"
                placeholder={t("register.emailPlaceholder")}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:outline-none transition-colors text-gray-900"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs font-medium pl-1 mt-1">
                {getEmailErrorMessage(errors.email.message)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">{t("register.passwordLabel")}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder={t("register.passwordPlaceholder")}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:outline-none transition-colors text-gray-900"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? (
               <p className="text-red-500 text-xs font-medium pl-1 mt-1">{getPasswordErrorMessage(errors.password.message)}</p>
            ) : (
               <p className="text-[11px] text-gray-500 font-medium pt-1 ml-1">{t("register.passwordHint")}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {isSubmitting ? t("register.submitting") : t("register.submitBtn")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-500 font-medium">
          {t("register.hasAccount")}{" "}
          <Link href="/login" className="text-primary hover:text-primary-hover font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded">
            {t("register.loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
