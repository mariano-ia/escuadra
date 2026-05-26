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
