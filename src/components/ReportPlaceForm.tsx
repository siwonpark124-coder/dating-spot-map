"use client";

import { useActionState, useState } from "react";
import { submitPlaceFeedback, ActionState } from "@/app/place/[id]/actions";
import { PlaceFeedbackCategory } from "@/types/feedback";

const CATEGORIES: PlaceFeedbackCategory[] = ["잘못된 정보", "폐업/이전", "부적절한 장소", "기타"];
const initialState: ActionState = { error: null };

export default function ReportPlaceForm({ placeId }: { placeId: string }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [state, formAction] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await submitPlaceFeedback(prev, formData);
    if (!result.error) setSubmitted(true);
    return result;
  }, initialState);

  if (submitted) {
    return <p className="text-xs text-stone-500">신고해주셔서 감사해요. 확인 후 반영할게요.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-stone-400 underline hover:text-stone-600"
      >
        정보가 잘못됐나요? 신고하기
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3">
      <input type="hidden" name="place_id" value={placeId} />
      <select
        name="category"
        defaultValue=""
        className="rounded border border-stone-300 px-2 py-1 text-sm focus:border-stone-500 focus:outline-none"
      >
        <option value="" disabled>
          신고 사유 선택
        </option>
        {CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <textarea
        name="message"
        rows={2}
        placeholder="구체적으로 알려주시면 도움이 돼요"
        className="rounded border border-stone-300 p-2 text-sm focus:border-stone-500 focus:outline-none"
      />
      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white hover:bg-stone-700">
          제출
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-stone-500">
          취소
        </button>
      </div>
    </form>
  );
}
