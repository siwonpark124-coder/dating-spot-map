"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated } from "@/app/review/actions";

export async function resolvePlaceFeedback(formData: FormData) {
  if (!(await isAuthenticated())) return;
  const id = String(formData.get("id"));
  const { error } = await supabaseAdmin.from("place_feedback").update({ status: "resolved" }).eq("id", id);
  if (error) console.error("resolvePlaceFeedback failed:", error.message);
  revalidatePath("/review/feedback");
}

export async function resolveSiteFeedback(formData: FormData) {
  if (!(await isAuthenticated())) return;
  const id = String(formData.get("id"));
  const { error } = await supabaseAdmin.from("site_feedback").update({ status: "resolved" }).eq("id", id);
  if (error) console.error("resolveSiteFeedback failed:", error.message);
  revalidatePath("/review/feedback");
}

export async function resolveCourseSuggestion(formData: FormData) {
  if (!(await isAuthenticated())) return;
  const id = String(formData.get("id"));
  const { error } = await supabaseAdmin.from("course_suggestions").update({ status: "resolved" }).eq("id", id);
  if (error) console.error("resolveCourseSuggestion failed:", error.message);
  revalidatePath("/review/feedback");
}

export async function resolveBusinessInquiry(formData: FormData) {
  if (!(await isAuthenticated())) return;
  const id = String(formData.get("id"));
  const { error } = await supabaseAdmin.from("business_inquiries").update({ status: "resolved" }).eq("id", id);
  if (error) console.error("resolveBusinessInquiry failed:", error.message);
  revalidatePath("/review/feedback");
}
