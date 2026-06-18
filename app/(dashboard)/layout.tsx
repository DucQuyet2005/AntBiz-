"use client";

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <LanguageProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-[280px] overflow-y-auto flex flex-col justify-between">
          <div className="max-w-[1200px] w-full mx-auto px-10 flex flex-col pb-12">
            <Header />
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full"
            >
              {children}
            </motion.div>
          </div>
          <Footer />
        </main>
      </div>
    </LanguageProvider>
  );
}

