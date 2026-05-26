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
