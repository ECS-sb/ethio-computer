"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { useT } from "@/components/i18n-provider";
import { setTelegramStaffActiveAction, setTelegramStaffPermissionAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

/** አንድ ፈቃድ (ወይም ሰራተኛውን በአጠቃላይ) የሚያበራ/የሚያጠፋ ማብሪያ፤ ሲነካ ወዲያው ይቀመጣል። */
export function StaffSwitch({
  staffId,
  permission,
  checked,
  label,
  hint,
}: {
  staffId: string;
  /** ባዶ ሲሆን ሰራተኛውን በአጠቃላይ ያበራል/ያጠፋል */
  permission?: string;
  checked: boolean;
  label: string;
  hint?: string;
}) {
  const t = useT();
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [pending, startTransition] = useTransition();
  const id = `${staffId}-${permission ?? "active"}`;

  const toggle = () => {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const data = new FormData();
      data.set("id", staffId);
      data.set("enabled", String(next));
      if (permission) data.set("permission", permission);
      const result = await (permission ? setTelegramStaffPermissionAction(data) : setTelegramStaffActiveAction(data));
      if (!result.ok) toast.error(t(result.message));
    });
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex min-w-0 flex-col">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={optimistic}
        disabled={pending}
        onClick={toggle}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70",
          optimistic ? "bg-primary" : "bg-muted ring-1 ring-foreground/20"
        )}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-[inset-inline-start]", optimistic ? "start-[1.375rem]" : "start-0.5")} />
      </button>
    </div>
  );
}
