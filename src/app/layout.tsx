import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CropGuard",
  description: "Agricultural resilience monitoring platform",
  icons: { icon: '/icon.png' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-geist-sans)',
              fontSize: '14px',
              borderRadius: '12px',
            },
            classNames: {
              toast: 'shadow-lg border border-gray-100',
              success: '!bg-white !text-[#1A3D2B] [&_[data-icon]]:text-[#3D7A56]',
              error: '!bg-white !text-[#D94F3D] [&_[data-icon]]:text-[#D94F3D]',
              warning: '!bg-white !text-[#E8963A] [&_[data-icon]]:text-[#E8963A]',
              info: '!bg-white !text-[#2B7BB9] [&_[data-icon]]:text-[#2B7BB9]',
            },
          }}
        />
      </body>
    </html>
  );
}
