import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PWARegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Myelin",
  description: "A premium daily productivity workspace.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
