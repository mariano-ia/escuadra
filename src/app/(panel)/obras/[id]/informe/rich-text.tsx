"use client";

import { useRef, useState } from "react";

/** Editor de texto enriquecido mínimo (negrita, itálica, subrayado, lista, subtítulo).
 *  Emite HTML en un input oculto; se sanitiza en el server al guardar. */
export function RichText({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState("");
  const sync = () => setHtml(ref.current?.innerHTML ?? "");
  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
    sync();
  };
  return (
    <div>
      <div className="flex items-center gap-1 border border-rule border-b-0 px-2 py-1.5">
        <Btn onClick={() => exec("bold")} label="B" className="font-bold" />
        <Btn onClick={() => exec("italic")} label="I" className="italic" />
        <Btn onClick={() => exec("underline")} label="U" className="underline" />
        <span className="w-px h-4 bg-rule mx-1" />
        <Btn onClick={() => exec("insertUnorderedList")} label="•" />
        <Btn onClick={() => exec("formatBlock", "<h3>")} label="H" />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        data-placeholder="Escribí la nota para el cliente…"
        className="prose-note min-h-40 border border-rule p-3 outline-none text-sm leading-relaxed focus:border-grey"
      />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}

function Btn({ onClick, label, className = "" }: { onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-8 h-7 grid place-items-center text-sm text-grey hover:text-ink hover:bg-paper ${className}`}
    >
      {label}
    </button>
  );
}
