"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPassword, verifyPassword } from "@/lib/password";
import { PlaceFeedbackCategory } from "@/types/feedback";

export interface ActionState {
  error: string | null;
}

export async function createReview(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const placeId = String(formData.get("place_id"));
  const nickname = String(formData.get("nickname") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!placeId || !nickname || !password || !content) {
    return { error: "닉네임, 비밀번호, 내용을 모두 입력해주세요." };
  }

  const { error } = await supabaseAdmin.from("reviews").insert({
    place_id: placeId,
    nickname,
    password_hash: hashPassword(password),
    content,
  });

  if (error) {
    console.error("createReview failed:", error.message);
    return { error: "저장에 실패했어요. 다시 시도해주세요." };
  }

  revalidatePath(`/place/${placeId}`);
  return { error: null };
}

export async function deleteReview(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const reviewId = String(formData.get("review_id"));
  const placeId = String(formData.get("place_id"));
  const password = String(formData.get("password") ?? "");

  if (!reviewId || !password) {
    return { error: "비밀번호를 입력해주세요." };
  }

  const { data: review, error: fetchError } = await supabaseAdmin
    .from("reviews")
    .select("password_hash")
    .eq("id", reviewId)
    .single();

  if (fetchError || !review) {
    console.error("deleteReview lookup failed:", fetchError?.message);
    return { error: "후기를 찾을 수 없어요." };
  }

  if (!verifyPassword(password, review.password_hash)) {
    return { error: "비밀번호가 일치하지 않아요." };
  }

  const { error } = await supabaseAdmin.from("reviews").delete().eq("id", reviewId);
  if (error) {
    console.error("deleteReview failed:", error.message);
    return { error: "삭제에 실패했어요. 다시 시도해주세요." };
  }

  revalidatePath(`/place/${placeId}`);
  return { error: null };
}

export async function submitPlaceFeedback(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const placeId = String(formData.get("place_id"));
  const category = String(formData.get("category")) as PlaceFeedbackCategory;
  const message = String(formData.get("message") ?? "").trim();

  if (!placeId || !category || !message) {
    return { error: "카테고리와 내용을 입력해주세요." };
  }

  const { error } = await supabaseAdmin.from("place_feedback").insert({
    place_id: placeId,
    category,
    message,
  });

  if (error) {
    console.error("submitPlaceFeedback failed:", error.message);
    return { error: "제출에 실패했어요. 다시 시도해주세요." };
  }

  return { error: null };
}
