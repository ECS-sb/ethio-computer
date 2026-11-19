"use client";

import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { useLocale } from "@/components/i18n-provider";
import type { ActionResult } from "@/lib/actions";
import { localePath } from "@/lib/i18n";

/** ተግባሩ ሲሳካ ወደ ሌላ ገጽ ይወስዳል፤ በመንገዱ ውስጥ ያለው {id} በተመለሰው መለያ ይተካል። */
export function RedirectForm({
  action,
  to,
  className,
  children,
}: {
  action: (data: FormData) => Promise<ActionResult>;
  to: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const locale = useLocale();
  return (
    <ActionForm
      action={action}
      className={className}
      onSuccess={(result) => {
        if (result.id) router.push(localePath(locale, to.replace("{id}", result.id)));
      }}
    >
      {children}
    </ActionForm>
  );
}
