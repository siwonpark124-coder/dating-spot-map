"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ActionState } from "@/app/place/[id]/actions";

export async function submitBusinessInquiry(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const businessName = String(formData.get("business_name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!businessName || !contact || !message) {
    return { error: "상호명, 연락처, 문의 내용을 모두 입력해주세요." };
  }

  const { error } = await supabaseAdmin.from("business_inquiries").insert({
    business_name: businessName,
    contact,
    message,
  });

  if (error) {
    console.error("submitBusinessInquiry failed:", error.message);
    return { error: "제출에 실패했어요. 다시 시도해주세요." };
  }

  return { error: null };
}
