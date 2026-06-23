import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FontProvider } from "@/contexts/FontContext";
import { cookies } from "next/headers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "AntBiz AI Content Publisher",
  description: "Manage your AI content easily",
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
    >
      <body className="min-h-full flex flex-col text-gray-800 bg-[#F4F5F9] font-sans">
        <ThemeProvider>
          <FontProvider>
            <LanguageProvider defaultLanguage={lang}>
              {children}
            </LanguageProvider>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
