"use client";

import { useEffect, useRef, useState } from "react";
import { CourseStop } from "@/lib/course";

interface SearchResult {
  label: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
}

/** 검색어를 다 칠 때까지 기다렸다 부르는 시간 */
const DEBOUNCE_MS = 300;

export default function CourseSearchBox({
  onPick,
  disabled,
}: {
  onPick: (stop: CourseStop) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;
  // 검색어가 짧아졌을 때 effect에서 결과를 지우면 렌더가 한 번 더 돈다.
  // 상태는 fetch 콜백에서만 건드리고, 표시 여부는 렌더에서 판단한다.
  const visibleResults = tooShort ? [] : results;

  useEffect(() => {
    if (tooShort) {
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
  }, [trimmed, tooShort]);

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? "코스가 가득 찼어요" : "전시회·공원 등 직접 검색해서 추가"}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none disabled:bg-stone-100"
      />

      {status === "error" && !tooShort && (
        <p className="mt-1 text-xs text-red-600">검색에 실패했어요. 잠시 후 다시 시도해주세요.</p>
      )}

      {visibleResults.length > 0 && (
        <ul className="absolute bottom-full z-20 mb-1 max-h-64 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg">
          {visibleResults.map((r) => (
            <li key={`${r.label}-${r.lat}-${r.lng}`}>
              <button
                type="button"
                onClick={() => {
                  onPick({ placeId: null, label: r.label, lat: r.lat, lng: r.lng, subtitle: r.category });
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-stone-100"
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
  );
}
