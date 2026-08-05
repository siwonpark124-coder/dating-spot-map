"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitCourseSuggestion } from "./actions";
import { ActionState } from "@/app/place/[id]/actions";

const initialState: ActionState = { error: null };

export default function CourseSuggestionsPage() {
  const [submitted, setSubmitted] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await submitCourseSuggestion(prev, formData);
      if (!result.error) setSubmitted(true);
      return result;
    },
    initialState
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f1e7] p-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Link href="/" className="text-sm text-amber-700 underline">
          ← 지도로 돌아가기
        </Link>

        <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-6">
          <h1 className="text-lg font-bold text-stone-900">코스 추천하기</h1>
          <p className="text-sm text-stone-500">
            나만 아는 소개팅 코스가 있다면 알려주세요. 예: &ldquo;A에서 저녁 먹고 B카페로 이동해서
            대화하다가 C바에서 마무리하는 코스&rdquo;처럼 편하게 적어주시면 돼요.
          </p>

          {submitted && (
            <p className="rounded bg-stone-100 px-3 py-2 text-sm text-stone-700">
              추천 감사해요! 검토 후 다른 분들께도 소개할게요.
            </p>
          )}

          <form action={formAction} className="flex flex-col gap-3">
            <input
              name="nickname"
              placeholder="닉네임 (선택)"
              className="rounded border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            />
            <textarea
              name="content"
              rows={5}
              placeholder="추천 코스를 적어주세요"
              className="rounded border border-stone-300 p-3 text-sm focus:border-stone-500 focus:outline-none"
            />
            {state.error && <p className="text-xs text-red-500">{state.error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="self-end rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"
            >
              추천하기
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
