"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitBusinessInquiry } from "./actions";
import { ActionState } from "@/app/place/[id]/actions";

const initialState: ActionState = { error: null };

export default function BusinessPage() {
  const [submitted, setSubmitted] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await submitBusinessInquiry(prev, formData);
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
          <h1 className="text-lg font-bold text-stone-900">비즈니스 협업 문의</h1>
          <p className="text-sm text-stone-500">
            매장 등록/제휴, 광고, 그 외 협업 제안을 남겨주시면 확인 후 연락드릴게요.
          </p>

          {submitted && (
            <p className="rounded bg-stone-100 px-3 py-2 text-sm text-stone-700">
              문의 감사해요. 확인 후 연락드릴게요.
            </p>
          )}

          <form action={formAction} className="flex flex-col gap-3">
            <input
              name="business_name"
              placeholder="상호명"
              className="rounded border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            />
            <input
              name="contact"
              placeholder="연락처 (전화번호 또는 이메일)"
              className="rounded border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            />
            <textarea
              name="message"
              rows={4}
              placeholder="문의 내용을 적어주세요"
              className="rounded border border-stone-300 p-3 text-sm focus:border-stone-500 focus:outline-none"
            />
            {state.error && <p className="text-xs text-red-500">{state.error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="self-end rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"
            >
              문의하기
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
