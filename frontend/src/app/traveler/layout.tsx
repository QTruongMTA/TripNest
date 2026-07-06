import { Footer } from "@/components/shared/Footer";
import { Header } from "@/components/shared/Header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-emerald-950">
        <Header overlay={false} />
      </div>
      <main>{children}</main>
      <Footer />
    </div>
  );
}
