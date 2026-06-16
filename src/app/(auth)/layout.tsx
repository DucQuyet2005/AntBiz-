export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4 sm:p-8">
      {children}
    </div>
  );
}
