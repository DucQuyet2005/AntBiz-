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
  Compass,
  X,
  Users,
  History,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const Sidebar = ({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) => {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const supabase = createClient();

  const handleLogout = async () => {
    sessionStorage.setItem('logging_out', 'true');
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (data) {
          setUserRole(data.role);
        }
      }
    };
    fetchRole();
  }, [supabase]);

  const navItems = [
    { href: "/overview", label: t("sidebar.overview"), icon: LayoutDashboard },
    ...(userRole !== 'admin' ? [
      { href: "/ai-creator", label: t("sidebar.aiCreator"), icon: Wand2 },
      { href: "/prompts", label: t("sidebar.prompts"), icon: FileText },
      { href: "/content-calendar", label: t("sidebar.contentCalendar"), icon: CalendarDays },
      { href: "/archive", label: t("sidebar.archive"), icon: Archive },
    ] : []),
    ...(userRole === 'admin' ? [
      { href: "/admin/users", label: t("admin.userManagement"), icon: Users },
      { href: "/admin/audit-logs", label: t("admin.auditLogs"), icon: History },
      { href: "/admin/landing-editor", label: t("sidebar.landingEditor"), icon: Globe },
    ] : []),
    { href: "/settings", label: t("sidebar.settings"), icon: Settings },
    { href: "/faq", label: t("sidebar.faq"), icon: HelpCircle },
  ];

  return (
    <aside className={`w-[280px] h-screen bg-sidebar flex flex-col justify-between pt-0 pb-8 px-0 rounded-tr-[32px] fixed left-0 top-0 overflow-y-auto no-scrollbar z-50 transition-transform duration-300 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div>
        <div className="bg-primary pt-8 pb-6 px-6 w-full mb-6 rounded-tr-[32px] flex items-center justify-between gap-3 text-white shadow-md shadow-primary/20 transition-all duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-inner">
              <img
                src="/images/logo.png"
                alt="AntBiz Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="font-black text-base tracking-tight leading-none text-white truncate">
                {t("sidebar.title")}
              </h1>
              <p className="text-[10px] text-white/80 leading-none mt-1 truncate">
                {t("sidebar.subtitle")}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="lg:hidden text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-2 pr-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 py-3 transition-all relative ${
                  isActive
                    ? "bg-primary/8 text-primary border-l-4 border-primary pl-5 pr-4 rounded-r-xl rounded-l-none font-extrabold shadow-sm shadow-primary/5"
                    : "text-text-muted hover:bg-white/50 hover:text-text pl-5 pr-4 border-l-4 border-transparent rounded-r-xl rounded-l-none"
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2 mt-auto pt-8 pl-6 pr-6">
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

        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-4 py-3 text-text-muted hover:text-text font-medium transition-colors w-full text-left bg-transparent border-0 cursor-pointer"
        >
          <LogOut size={20} />
          {t("sidebar.logout")}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
