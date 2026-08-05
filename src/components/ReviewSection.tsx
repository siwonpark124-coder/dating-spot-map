"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Review } from "@/types/review";
import { createReview, deleteReview, ActionState } from "@/app/place/[id]/actions";

const initialState: ActionState = { error: null };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function DeleteReviewForm({ reviewId, placeId }: { reviewId: string; placeId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(deleteReview, initialState);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-stone-400 hover:text-red-600">
        삭제
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1">
      <input type="hidden" name="review_id" value={reviewId} />
      <input type="hidden" name="place_id" value={placeId} />
      <input
        type="password"
        name="password"
        placeholder="비밀번호"
        className="w-24 rounded border border-stone-300 px-1.5 py-0.5 text-xs"
      />
      <button type="submit" disabled={isPending} className="text-xs text-red-600 hover:underline">
        확인
      </button>
      {state.error && <span className="text-xs text-red-500">{state.error}</span>}
    </form>
  );
}

export default function ReviewSection({ placeId, reviews }: { placeId: string; reviews: Review[] }) {
  const [state, formAction] = useActionState(createReview, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error === null) formRef.current?.reset();
  }, [state]);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-stone-900">후기 {reviews.length}개</h2>

      <div className="flex flex-col gap-3">
        {reviews.length === 0 && (
          <p className="text-sm text-stone-500">아직 후기가 없어요. 첫 후기를 남겨보세요.</p>
        )}
        {reviews.map((review) => (
          <div key={review.id} className="rounded-lg border border-stone-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-800">{review.nickname}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400">{formatDate(review.created_at)}</span>
                <DeleteReviewForm reviewId={review.id} placeId={placeId} />
              </div>
            </div>
            <p className="mt-1 text-sm text-stone-700">{review.content}</p>
          </div>
        ))}
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3"
      >
        <input type="hidden" name="place_id" value={placeId} />
        <div className="flex gap-2">
          <input
            name="nickname"
            placeholder="닉네임"
            className="w-28 rounded border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
          />
          <input
            name="password"
            type="password"
            placeholder="비밀번호"
            className="w-28 rounded border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>
        <textarea
          name="content"
          rows={2}
          placeholder="후기를 남겨주세요"
          className="rounded border border-stone-300 p-2 text-sm focus:border-stone-500 focus:outline-none"
        />
        {state.error && <p className="text-xs text-red-500">{state.error}</p>}
        <button
          type="submit"
          className="self-end rounded-lg bg-stone-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700"
        >
          등록
        </button>
      </form>
    </section>
  );
}
