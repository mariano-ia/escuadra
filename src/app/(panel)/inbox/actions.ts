"use server";

import { revalidatePath } from "next/cache";
import { getActiveStudio } from "@/lib/auth/session";
import { moveEntryToObra } from "@/lib/db/repos";

export async function moveEntryAction(formData: FormData) {
  const ctx = await getActiveStudio();
  if (!ctx) return;
  const entryId = String(formData.get("entryId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  if (!entryId || !obraId) return;
  await moveEntryToObra({ studioId: ctx.studio.id, entryId, obraId });
  revalidatePath("/inbox");
  revalidatePath("/obras");
}

/** Asignación masiva: mueve varias entradas a una obra de una sola vez. */
export async function moveManyAction(formData: FormData) {
  const ctx = await getActiveStudio();
  if (!ctx) return;
  const obraId = String(formData.get("obraId") ?? "");
  const entryIds = formData.getAll("entryId").map(String).filter(Boolean);
  if (!obraId || entryIds.length === 0) return;
  for (const entryId of entryIds) await moveEntryToObra({ studioId: ctx.studio.id, entryId, obraId });
  revalidatePath("/inbox");
  revalidatePath("/obras");
}
