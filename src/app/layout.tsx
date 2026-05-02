import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Saira } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const display = Saira({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "800", "900"],
});

export const metadata: Metadata = {
  title: "终末地·基质刷取计算器 / ENDFIELD",
  description:
    "为《明日方舟：终末地》多件武器同时刷取基质，推荐最优能量淤积点和锁定词条组合。",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${jetbrainsMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col">
        <div className="scan-line-fixed" aria-hidden />
        {children}
      </body>
    </html>
  );
}
