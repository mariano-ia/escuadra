"use server";

import { redirect } from "next/navigation";
import { getActiveStudio } from "@/lib/auth/session";
import { freshOnboardingCode } from "@/lib/db/repos";

export async function generateCodeAction() {
  const ctx = await getActiveStudio();
  if (!ctx) redirect("/login");
  const code = await freshOnboardingCode(ctx.studio.id, ctx.user.id, ctx.user.email ?? "");
  redirect(`/settings?code=${encodeURIComponent(code)}`);
}
