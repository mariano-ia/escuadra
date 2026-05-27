"use client";

import { useState } from "react";
import { uploadLogoAction } from "./actions";

/** Control de logo con label custom: dice "Editar" si ya hay logo (en vez del feo "No file chosen"). */
export function LogoUpload({ logoUrl }: { logoUrl: string | null }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="flex items-center gap-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="logo" className="w-16 h-16 object-contain border border-rule bg-paper p-1" />
      ) : (
        <div className="w-16 h-16 border border-rule bg-paper grid place-items-center text-grey-light text-xs">—</div>
      )}
      <form action={uploadLogoAction} onSubmit={() => setSubmitting(true)} className="flex items-center gap-3">
        <label className="cursor-pointer border border-ink font-display text-xs uppercase tracking-wide px-4 py-2 hover:bg-ink hover:text-bg transition-colors">
          {logoUrl ? "Editar" : "Elegir logo"}
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        {fileName && <span className="text-xs text-grey truncate max-w-[160px]">{fileName}</span>}
        {fileName && (
          <button disabled={submitting} className="bg-ink text-bg font-display text-xs tracking-wide px-4 py-2 disabled:opacity-50">
            {submitting ? "Subiendo…" : "Subir"}
          </button>
        )}
      </form>
    </div>
  );
}
