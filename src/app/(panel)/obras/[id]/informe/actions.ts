"use server";

import { getActiveStudio } from "@/lib/auth/session";
import { createReport } from "@/lib/reports";

export type ReportState = { token?: string; error?: string } | null;

export async function createReportAction(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const ctx = await getActiveStudio();
  if (!ctx) return { error: "Sesión expirada." };

  const obraId = String(formData.get("obraId") ?? "");
  const title = (String(formData.get("title") ?? "").trim()) || "Avance de obra";
  const note = (String(formData.get("note") ?? "").trim()) || null;
  const photoIds = formData.getAll("photo").map(String).filter(Boolean);

  if (!obraId) return { error: "Falta la obra." };
  if (photoIds.length === 0) return { error: "Elegí al menos una foto." };

  try {
    const token = await createReport({
      studioId: ctx.studio.id,
      obraId,
      userId: ctx.user.id,
      title,
      note,
      photoIds,
    });
    return { token };
  } catch {
    return { error: "No se pudo generar el informe." };
  }
}
