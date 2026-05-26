"use client";

import { useState, useEffect } from "react";

/** Imagen que se abre en un modal (lightbox), no en otra pestaña. */
export function ZoomImage({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`block cursor-zoom-in ${className}`} aria-label="Ampliar imagen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-ink/85 grid place-items-center p-4 sm:p-10 cursor-zoom-out"
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-w-full max-h-full object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-5 text-bg/90 hover:text-bg font-display text-sm tracking-[0.2em] uppercase"
          >
            Cerrar ✕
          </button>
        </div>
      )}
    </>
  );
}
