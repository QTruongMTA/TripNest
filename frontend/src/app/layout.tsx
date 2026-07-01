import type { Metadata } from "next";
import localFont from "next/font/local";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { SessionBootstrap } from "@/components/auth/SessionBootstrap";
import "./globals.css";

const bodyFont = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "TripNest",
  description: "Nền tảng đặt chỗ nghỉ và khám phá hành trình tại Việt Nam.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={bodyFont.variable}>
        <SessionBootstrap />
        <EmailVerificationBanner />
        {children}
      </body>
    </html>
  );
}
