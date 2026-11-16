"use client";

import { useState } from "react";
import { FieldSelect } from "@/components/field-select";
import type { Option } from "@/lib/catalog";

/** FieldSelect በተለመደ ቅጽ (ActionForm) ውስጥ፦ የተመረጠው እሴት በname ይላካል። */
export function SelectInput({ id, name, options, defaultValue = "", placeholder }: { id: string; name: string; options: Option[]; defaultValue?: string; placeholder?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <FieldSelect id={id} value={value} onChange={setValue} options={options} placeholder={placeholder} />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
