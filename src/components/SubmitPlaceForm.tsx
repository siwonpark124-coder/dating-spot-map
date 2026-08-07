"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitPlace, SubmitState } from "@/app/submit-place/actions";

interface SearchResult {
  label: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  kakaoPlaceId: string;
  categoryName: string;
  placeUrl: string;
}

const DEBOUNCE_MS = 300;
const initialState: SubmitState = { error: null };

export default function SubmitPlaceForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [state, formAction, isPending] = useActionState(submitPlace, initialState);

  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;
  // 고른 뒤에는 목록을 감춘다. 상태를 지우면 렌더가 한 번 더 돌아서 렌더에서 판단한다.
  const visibleResults = picked || tooShort ? [] : results;

  useEffect(() => {
    if (tooShort || picked) {
      abortRef.current?.abort();
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      try {
        const res = await fetch(`/api/place-search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setResults(data.results ?? []);
        setStatus("idle");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setResults([]);
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed, tooShort, picked]);

  if (state.done) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-5">
        <p className="text-sm font-medium text-stone-900">신청 감사해요 🙏</p>
        <p className="text-sm text-stone-600">
          바로 지도에 올라가지는 않아요. 직접 확인하고 분위기·가격대를 채운 뒤에 올리기 때문에
          며칠 걸릴 수 있어요.
        </p>
        <button
          type="button"
          onClick={() => {
            setPicked(null);
            setQuery("");
            setResults([]);
            // useActionState는 초기화 API가 없어 새로 그리게 한다
            window.location.reload();
          }}
          className="mt-1 self-start text-sm text-amber-700 underline"
        >
          한 곳 더 신청하기
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {picked ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-700 bg-amber-50 p-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium text-stone-900">{picked.label}</span>
            <span className="text-xs text-stone-500">
              {[picked.category, picked.address].filter(Boolean).join(" · ")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setQuery("");
            }}
            className="shrink-0 text-xs text-stone-500 underline"
          >
            다시 찾기
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="가게 이름을 검색해주세요"
            autoFocus
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
          />
          {status === "loading" && !tooShort && (
            <p className="mt-1 text-xs text-stone-400">찾는 중…</p>
          )}
          {status === "error" && !tooShort && (
            <p className="mt-1 text-xs text-red-600">검색에 실패했어요. 잠시 후 다시 시도해주세요.</p>
          )}

          {visibleResults.length > 0 && (
            <ul className="mt-1 flex max-h-72 flex-col overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-sm">
              {visibleResults.map((r) => (
                <li key={r.kakaoPlaceId}>
                  <button
                    type="button"
                    onClick={() => setPicked(r)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-stone-100"
                  >
                    <span className="text-sm font-medium text-stone-900">{r.label}</span>
                    <span className="text-xs text-stone-500">
                      {[r.category, r.address].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {picked && (
        <>
          {/* 좌표·업종·카카오 id는 검색 결과에서 그대로 넘긴다.
              손으로 적게 하면 지도에 못 찍고 중복도 못 거른다. */}
          <input type="hidden" name="kakao_place_id" value={picked.kakaoPlaceId} />
          <input type="hidden" name="name" value={picked.label} />
          <input type="hidden" name="address" value={picked.address} />
          <input type="hidden" name="category_name" value={picked.categoryName} />
          <input type="hidden" name="place_url" value={picked.placeUrl} />
          <input type="hidden" name="lat" value={picked.lat} />
          <input type="hidden" name="lng" value={picked.lng} />

          <textarea
            name="note"
            rows={3}
            maxLength={200}
            placeholder="어떤 점이 소개팅에 좋았나요? (선택) — 예: 2층 창가 자리가 조용해서 대화하기 좋아요"
            className="rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={isPending}
            className="self-end rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-900 disabled:bg-stone-300"
          >
            {isPending ? "보내는 중…" : "신청하기"}
          </button>
        </>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
