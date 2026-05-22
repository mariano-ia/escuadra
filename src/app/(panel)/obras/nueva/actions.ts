"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getActiveStudio } from "@/lib/auth/session";
import { createObra } from "@/lib/db/repos";

export type CreateObraState = { error?: string } | null;

const schema = z.object({
  name: z.string().min(2, "El nombre es muy corto").max(80),
  address: z.string().max(200).optional(),
  clientName: z.string().max(80).optional(),
});

export async function createObraAction(
  _prev: CreateObraState,
  formData: FormData,
): Promise<CreateObraState> {
  const ctx = await getActiveStudio();
  if (!ctx) redirect("/login");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    clientName: formData.get("clientName") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const id = await createObra({
    studioId: ctx.studio.id,
    userId: ctx.user.id,
    name: parsed.data.name,
    address: parsed.data.address ?? null,
    clientName: parsed.data.clientName ?? null,
  });
  redirect(`/obras/${id}`);
}
