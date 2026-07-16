import Script from "next/script";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FontProvider } from "@/contexts/FontContext";
import QueryProvider from "@/components/QueryProvider";
import { cookies } from "next/headers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "AntBiz - Hệ thống Sáng tạo & Lên lịch Đăng bài AI",
  description: "Tối ưu hóa quy trình sản xuất nội dung, sáng tạo ý tưởng và tự động hóa lịch đăng bài đa kênh hiệu quả cùng trí tuệ nhân tạo.",
  icons: {
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value as "vi" | "en") || "vi";

  return (
    <html
      lang={lang}
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <Script
          id="theme-detect"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedDark = localStorage.getItem('app-dark-mode');
                  var isDark = false;
                  if (savedDark !== null) {
                    isDark = savedDark === 'true';
                  } else {
                    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  var savedTheme = localStorage.getItem('app-theme') || 'solid-blue';
                  document.documentElement.classList.add('theme-' + savedTheme);
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col text-gray-800 bg-[#F4F5F9] font-sans">
        <ThemeProvider>
          <FontProvider>
            <QueryProvider>
              <LanguageProvider defaultLanguage={lang}>
                {children}
              </LanguageProvider>
            </QueryProvider>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
