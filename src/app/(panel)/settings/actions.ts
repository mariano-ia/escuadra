"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveStudio } from "@/lib/auth/session";
import { freshOnboardingCode } from "@/lib/db/repos";
import { createAdminClient } from "@/lib/db/supabase";

export async function generateCodeAction() {
  const ctx = await getActiveStudio();
  if (!ctx) redirect("/login");
  const code = await freshOnboardingCode(ctx.studio.id, ctx.user.id, ctx.user.email ?? "");
  redirect(`/settings?code=${encodeURIComponent(code)}`);
}

export async function updateNameAction(formData: FormData) {
  const ctx = await getActiveStudio();
  if (!ctx) redirect("/login");
  const name = String(formData.get("full_name") ?? "").trim().slice(0, 80);
  if (name) {
    await createAdminClient().from("profiles").update({ full_name: name }).eq("id", ctx.user.id);
  }
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function updateStudioAction(formData: FormData) {
  const ctx = await getActiveStudio();
  if (!ctx) redirect("/login");
  const name = String(formData.get("studio_name") ?? "").trim().slice(0, 80);
  if (name) await createAdminClient().from("studios").update({ name }).eq("id", ctx.studio.id);
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function uploadLogoAction(formData: FormData) {
  const ctx = await getActiveStudio();
  if (!ctx) redirect("/login");
  const file = formData.get("logo") as File | null;
  if (file && file.size > 0 && file.size < 4 * 1024 * 1024) {
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
    const path = `${ctx.studio.id}/branding/logo.${ext}`;
    const admin = createAdminClient();
    await admin.storage.from("obra-media").upload(path, buf, { contentType: file.type, upsert: true });
    await admin.from("studios").update({ logo_storage_path: path }).eq("id", ctx.studio.id);
  }
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
