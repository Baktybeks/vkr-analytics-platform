import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Учёт тем ВКР",
  description:
    "Веб-система для учёта и контроля повторяемости тем выпускных квалификационных работ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
