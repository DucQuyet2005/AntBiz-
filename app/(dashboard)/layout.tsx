import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LanguageProvider } from '@/contexts/LanguageContext';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LanguageProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-[280px] overflow-y-auto flex flex-col justify-between">
          <div className="max-w-[1200px] w-full mx-auto px-10 flex flex-col pb-12">
            <Header />
            {children}
          </div>
          <Footer />
        </main>
      </div>
    </LanguageProvider>
  );
}

