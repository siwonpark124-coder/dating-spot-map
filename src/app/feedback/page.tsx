"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitSiteFeedback } from "./actions";
import { ActionState } from "@/app/place/[id]/actions";

const initialState: ActionState = { error: null };

export default function FeedbackPage() {
  const [submitted, setSubmitted] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await submitSiteFeedback(prev, formData);
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
          <h1 className="text-lg font-bold text-stone-900">사이트 피드백</h1>
          <p className="text-sm text-stone-500">
            불편했던 점, 있었으면 하는 기능 등 뭐든 편하게 남겨주세요.
          </p>

          {submitted && (
            <p className="rounded bg-stone-100 px-3 py-2 text-sm text-stone-700">
              소중한 의견 감사해요. 확인 후 반영할게요.
            </p>
          )}

          <form action={formAction} className="flex flex-col gap-3">
            <textarea
              name="message"
              rows={5}
              placeholder="의견을 남겨주세요"
              className="rounded border border-stone-300 p-3 text-sm focus:border-stone-500 focus:outline-none"
            />
            {state.error && <p className="text-xs text-red-500">{state.error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="self-end rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"
            >
              보내기
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
