"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ActionState } from "@/app/place/[id]/actions";

export async function submitCourseSuggestion(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "코스 내용을 입력해주세요." };
  }

  const { error } = await supabaseAdmin.from("course_suggestions").insert({
    nickname: nickname || null,
    content,
  });

  if (error) {
    console.error("submitCourseSuggestion failed:", error.message);
    return { error: "제출에 실패했어요. 다시 시도해주세요." };
  }

  return { error: null };
}
