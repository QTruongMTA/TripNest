import HomePage from "../(public)/page";
import { Footer } from "@/components/shared/Footer";
import { Header } from "@/components/shared/Header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-95">
        <Header />
        <HomePage />
        <Footer />
      </div>
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" />
      <div className="relative z-10 grid min-h-screen place-items-center px-6 py-10">
        {children}
      </div>
    </main>
  );
}
