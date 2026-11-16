"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlusIcon } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/i18n-provider";
import { shrinkImage } from "@/components/screenshot-picker";
import { Button } from "@/components/ui/button";

function Preview({ file, alt }: { file: File; alt: string }) {
  const src = useMemo(() => URL.createObjectURL(file), [file]);
  return <Image unoptimized src={src} alt={alt} width={240} height={160} className="aspect-[3/2] w-60 rounded-xl object-cover ring-1 ring-foreground/10" />;
}

/** አንድ ፎቶ (ደረሰኝ፣ መታወቂያ)፦ በስልኩ ላይ ተቀንሶ በቅጹ ውስጥ በname ይላካል። */
export function ImageUploadField({ name, label }: { name: string; label: string }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);

  const pick = async (picked: File | undefined) => {
    if (!picked || !input.current) return;
    setWorking(true);
    try {
      const small = await shrinkImage(picked);
      const transfer = new DataTransfer();
      transfer.items.add(small);
      input.current.files = transfer.files;
      setFile(small);
    } catch {
      input.current.value = "";
      setFile(null);
      toast.error(t("This image couldn't be read. Use a JPG, PNG or WebP file."));
    }
    setWorking(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        id={name}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label={label}
        onChange={(event) => void pick(event.target.files?.[0])}
      />
      {file ? <Preview file={file} alt={label} /> : null}
      <Button type="button" variant="outline" className="w-fit" disabled={working} onClick={() => input.current?.click()}>
        <ImagePlusIcon data-icon="inline-start" />
        {working ? t("Sending…") : file ? t("Change photo") : label}
      </Button>
    </div>
  );
}
