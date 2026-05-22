import { Footer } from "@/components/shared/Footer";
import { Header } from "@/components/shared/Header";
import { headers } from "next/headers";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-invoke-path");
  const isHome = pathname === "/";

  return (
    <div className="min-h-screen bg-[#f7fbfa] text-slate-900">
      {isHome ? (
        <Header />
      ) : (
        <div className="bg-teal-900">
          <Header overlay={false} />
        </div>
      )}
      {children}
      <Footer />
    </div>
  );
}
