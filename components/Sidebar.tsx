"use client";

import React from "react";
import {
  LayoutDashboard,
  Wand2,
  CalendarDays,
  Archive,
  Settings,
  HelpCircle,
  HeadphonesIcon,
  LogOut,
  Globe,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/app/(dashboard)/actions";
import { useLanguage } from "@/contexts/LanguageContext";

const Sidebar = () => {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();

  return (
    <aside className="w-[280px] h-screen bg-sidebar flex flex-col justify-between py-8 px-6 rounded-r-[32px] fixed left-0 top-0 overflow-y-auto z-50">
      <div>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
              alt="User"
            />
          </div>
          <div>
            <h1 className="font-bold text-lg text-primary">
              {t("sidebar.title")}
            </h1>
            <p className="text-xs text-text-muted">{t("sidebar.subtitle")}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <Link
            href="/"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${
              pathname === "/"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-text-muted hover:bg-white/50 hover:text-text"
            }`}
          >
            <LayoutDashboard size={20} />
            {t("sidebar.overview")}
          </Link>

          <Link
            href="/ai-creator"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${
              pathname === "/ai-creator"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-text-muted hover:bg-white/50 hover:text-text"
            }`}
          >
            <Wand2 size={20} />
            {t("sidebar.aiCreator")}
          </Link>

          <Link
            href="/prompts"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${
              pathname === "/prompts"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-text-muted hover:bg-white/50 hover:text-text"
            }`}
          >
            <FileText size={20} />
            Prompts
          </Link>

          <Link
            href="/content-calendar"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${
              pathname === "/content-calendar"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-text-muted hover:bg-white/50 hover:text-text"
            }`}
          >
            <CalendarDays size={20} />
            {t("sidebar.contentCalendar")}
          </Link>

          <Link
            href="/archive"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${
              pathname === "/archive"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-text-muted hover:bg-white/50 hover:text-text"
            }`}
          >
            <Archive size={20} />
            {t("sidebar.archive")}
          </Link>

          <Link
            href="/settings"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${
              pathname === "/settings"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-text-muted hover:bg-white/50 hover:text-text"
            }`}
          >
            <Settings size={20} />
            {t("sidebar.settings")}
          </Link>

          <Link
            href="/faq"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${
              pathname === "/faq"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-text-muted hover:bg-white/50 hover:text-text"
            }`}
          >
            <HelpCircle size={20} />
            {t("sidebar.faq")}
          </Link>
        </nav>
      </div>

      <div className="flex flex-col gap-2 mt-auto pt-8">
        <div className="flex items-center justify-between px-4 py-2 mb-2 bg-white/30 rounded-2xl border border-white/10 text-xs select-none">
          <span className="font-semibold text-text-muted flex items-center gap-1.5">
            <Globe size={14} className="text-primary/70" />
            {language === "vi" ? "Ngôn ngữ" : "Language"}
          </span>

          <div className="flex gap-0.5 bg-white/50 p-0.5 rounded-lg border border-gray-200/50">
            <button
              onClick={() => setLanguage("vi")}
              className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] ${
                language === "vi"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-muted hover:text-text"
              }`}
            >
              VN
            </button>

            <button
              onClick={() => setLanguage("en")}
              className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] ${
                language === "en"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-muted hover:text-text"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        <button className="flex items-center gap-4 px-4 py-3 text-text-muted hover:text-text font-medium transition-colors w-full">
          <HeadphonesIcon size={20} />
          {t("sidebar.support")}
        </button>

        <form action={signout} className="w-full">
          <button
            type="submit"
            className="flex items-center gap-4 px-4 py-3 text-text-muted hover:text-text font-medium transition-colors w-full"
          >
            <LogOut size={20} />
            {t("sidebar.logout")}
          </button>
        </form>
      </div>
    </aside>
  );
};

export default Sidebar;
