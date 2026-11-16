import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Noto_Sans_Ethiopic, Plus_Jakarta_Sans } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { locales } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/i18n-server";
import "../globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const notoSansEthiopic = Noto_Sans_Ethiopic({
  variable: "--font-noto-ethiopic",
  subsets: ["ethiopic"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: "Ethio Computer", template: "%s | Ethio Computer" },
    description: t("The marketplace for social media accounts"),
    applicationName: "Ethio Computer",
    appleWebApp: { capable: true, title: "Ethio Computer", statusBarStyle: "black" },
  };
}

// በስልክ ላይ የአፑ የላይኛው አሞሌ ቀለም (ጨለማው ነባሪ ገጽታ)።
export const viewport: Viewport = { themeColor: "#000000", viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`dark ${plusJakarta.variable} ${dmSans.variable} ${notoSansEthiopic.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <I18nProvider locale={locale}>
            {children}
            <Toaster position="bottom-right" />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
