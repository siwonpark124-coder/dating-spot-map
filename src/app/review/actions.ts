"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MoodTag } from "@/types/place";

const AUTH_COOKIE = "review_auth";

export async function isAuthenticated() {
  const password = process.env.REVIEW_PASSWORD;
  if (!password) return false;
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE)?.value === password;
}

export async function authenticate(formData: FormData) {
  const password = process.env.REVIEW_PASSWORD;
  if (!password) return;
  if (formData.get("password") === password) {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  revalidatePath("/review");
}

export async function publishPlace(formData: FormData) {
  if (!(await isAuthenticated())) return;

  const id = String(formData.get("id"));
  const priceTierRaw = formData.get("price_tier");
  const curationNote = String(formData.get("curation_note") ?? "").trim();
  const moodTags = formData.getAll("mood_tags").map(String) as MoodTag[];

  if (!priceTierRaw || moodTags.length === 0) {
    return; // 필수 항목(분위기, 가격대) 누락 시 발행하지 않음 — 추천 이유는 선택
  }

  const { error } = await supabaseAdmin
    .from("places")
    .update({
      status: "published",
      mood_tags: moodTags,
      price_tier: Number(priceTierRaw),
      curation_note: curationNote || null,
    })
    .eq("id", id);

  if (error) console.error("publishPlace failed:", error.message);

  revalidatePath("/review");
  revalidatePath("/");
}

export async function rejectPlace(formData: FormData) {
  if (!(await isAuthenticated())) return;

  const id = String(formData.get("id"));
  const { error } = await supabaseAdmin.from("places").update({ status: "rejected" }).eq("id", id);

  if (error) console.error("rejectPlace failed:", error.message);

  revalidatePath("/review");
}

// 이미 발행된 장소를 수정할 때 사용 (분위기/가격대/추천 이유). status는 published로 유지.
export async function updatePublishedPlace(formData: FormData) {
  if (!(await isAuthenticated())) return;

  const id = String(formData.get("id"));
  const priceTierRaw = formData.get("price_tier");
  const curationNote = String(formData.get("curation_note") ?? "").trim();
  const moodTags = formData.getAll("mood_tags").map(String) as MoodTag[];

  if (!priceTierRaw || moodTags.length === 0) {
    return;
  }

  const { error } = await supabaseAdmin
    .from("places")
    .update({
      mood_tags: moodTags,
      price_tier: Number(priceTierRaw),
      curation_note: curationNote || null,
    })
    .eq("id", id);

  if (error) console.error("updatePublishedPlace failed:", error.message);

  revalidatePath("/review/published");
  revalidatePath("/");
  revalidatePath(`/place/${id}`);
}

// 이미 발행된 장소를 내림 (공개 사이트에서 제거)
export async function unpublishPlace(formData: FormData) {
  if (!(await isAuthenticated())) return;

  const id = String(formData.get("id"));
  const { error } = await supabaseAdmin.from("places").update({ status: "rejected" }).eq("id", id);

  if (error) console.error("unpublishPlace failed:", error.message);

  revalidatePath("/review/published");
  revalidatePath("/");
  revalidatePath(`/place/${id}`);
}
