"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** ነባሪው ጨለማ ነው፤ ተጠቃሚው light ሲመርጥ ብቻ ይቀየራል፣ ምርጫውም ይታወሳል (localStorage)። */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
