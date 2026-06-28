import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import AppShell from "@/components/layout/AppShell";
import SessionProvider from "@/components/providers/SessionProvider";

import { CommandMenu } from "@/components/ui/command-menu";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Earthana",
  description: "Advanced Environmental Solutions Management",
};

import { auth } from '@/auth';
import { getCompany } from "./actions/organization";

import { ThemeProvider } from "@/components/providers/ThemeProvider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const company = await getCompany();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <CommandMenu />
          <SessionProvider session={session}>
            <AppShell user={session?.user} userRole={session?.user?.role} userPermissions={session?.user?.permissions} company={company}>{children}</AppShell>
          </SessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
