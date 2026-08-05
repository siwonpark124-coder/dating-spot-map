"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ActionState } from "@/app/place/[id]/actions";

export async function submitSiteFeedback(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const message = String(formData.get("message") ?? "").trim();

  if (!message) {
    return { error: "내용을 입력해주세요." };
  }

  const { error } = await supabaseAdmin.from("site_feedback").insert({ message });

  if (error) {
    console.error("submitSiteFeedback failed:", error.message);
    return { error: "제출에 실패했어요. 다시 시도해주세요." };
  }

  return { error: null };
}
