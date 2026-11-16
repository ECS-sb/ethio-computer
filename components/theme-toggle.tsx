"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** ጨለማ ↔ ብሩህ። ምልክቱ በCSS (dark:) ስለሚመረጥ ከአገልጋዩ ጋር አይጋጭም። */
export function ThemeToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const label = t("Switch light or dark mode");
  return (
    <Button
      type="button"
      variant={withLabel ? "outline" : "ghost"}
      size={withLabel ? "default" : "icon"}
      aria-label={label}
      title={label}
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      className={cn(withLabel ? "justify-start gap-2 rounded-xl" : "size-10 rounded-full", className)}
    >
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="block dark:hidden" />
      {withLabel ? (
        <>
          <span className="hidden dark:inline">{t("Light mode")}</span>
          <span className="inline dark:hidden">{t("Dark mode")}</span>
        </>
      ) : null}
    </Button>
  );
}
