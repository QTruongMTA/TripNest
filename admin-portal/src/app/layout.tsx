import type { Metadata } from "next";
import "./globals.css";
import { SessionBootstrap } from "@/components/auth/SessionBootstrap";

export const metadata: Metadata = {
  title: "TripNest Portal",
  description: "Admin & Operator Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <SessionBootstrap />
        {children}
      </body>
    </html>
  );
}
