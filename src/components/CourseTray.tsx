"use client";

import { useState } from "react";
import {
  CourseStop,
  MAX_STOPS,
  courseLegs,
  formatDistance,
  moveStop,
  removeStop,
  totalWalkMinutes,
} from "@/lib/course";
import CourseSearchBox from "./CourseSearchBox";

interface CourseTrayProps {
  stops: CourseStop[];
  onChange: (stops: CourseStop[]) => void;
  onSave: (title: string) => Promise<string | null>;
  /** 실제 보행 경로. 있으면 그 시간을, 없으면 직선 추정치를 보여준다. */
  walkLegs?: { meters: number | null; minutes: number | null }[];
  /** 경로를 받아오는 중이면 지금 보이는 값이 추정치라는 걸 알려준다. */
  walkLoading?: boolean;
}

export default function CourseTray({
  stops,
  onChange,
  onSave,
  walkLegs,
  walkLoading,
}: CourseTrayProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (stops.length === 0) return null;

  const legs = courseLegs(stops, walkLegs);
  const isFull = stops.length >= MAX_STOPS;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const id = await onSave(title.trim());
      if (!id) {
        setError("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      setSavedUrl(`${window.location.origin}/course/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 border-t border-stone-300 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">
            내 코스 {stops.length}/{MAX_STOPS}
            {stops.length > 1 && (
              <span className="ml-2 font-normal text-stone-500">
                걸어서 총 {totalWalkMinutes(stops, walkLegs)}분
                {walkLoading && <span className="ml-1 text-stone-400">· 경로 계산 중…</span>}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="text-stone-500 underline hover:text-stone-700"
            >
              {collapsed ? "펼치기" : "접기"}
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-stone-500 underline hover:text-stone-700"
            >
              비우기
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            <ol className="flex flex-col gap-1.5">
              {stops.map((stop, i) => (
                <li key={`${stop.placeId ?? "pin"}-${stop.lat}-${stop.lng}`} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 rounded-lg border border-stone-200 p-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-stone-900">{stop.label}</span>
                      {stop.subtitle && (
                        <span className="truncate text-xs text-stone-500">{stop.subtitle}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onChange(moveStop(stops, i, -1))}
                      disabled={i === 0}
                      aria-label="위로"
                      className="px-1.5 text-stone-500 hover:text-stone-800 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(moveStop(stops, i, 1))}
                      disabled={i === stops.length - 1}
                      aria-label="아래로"
                      className="px-1.5 text-stone-500 hover:text-stone-800 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(removeStop(stops, i))}
                      aria-label="빼기"
                      className="px-1.5 text-stone-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>

                  {legs[i] && (
                    <div className="flex items-center gap-2 pl-8 text-xs text-stone-500">
                      <span>
                        도보 {legs[i].walkMinutes}분 · {formatDistance(legs[i].meters)}
                      </span>
                      {legs[i].isFar && <span className="text-amber-700">걷기엔 좀 멀어요</span>}
                      <a
                        href={legs[i].directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-stone-700"
                      >
                        길찾기
                      </a>
                    </div>
                  )}
                </li>
              ))}
            </ol>

            <CourseSearchBox
              disabled={isFull}
              onPick={(stop) => onChange([...stops, stop])}
            />

            {savedUrl ? (
              <div className="flex flex-col gap-1.5 rounded-lg bg-stone-100 p-2.5">
                <p className="text-xs text-stone-600">코스를 저장했어요. 이 링크를 보내면 돼요.</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={savedUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(savedUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        setCopied(false);
                      }
                    }}
                    className="shrink-0 rounded bg-stone-800 px-3 py-1.5 text-xs text-white hover:bg-stone-900"
                  >
                    {copied ? "복사됨" : "복사"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={40}
                  placeholder="코스 이름 (선택)"
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || stops.length < 2}
                  title={stops.length < 2 ? "두 곳 이상 담아야 코스가 돼요" : undefined}
                  className="shrink-0 rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white hover:bg-amber-900 disabled:bg-stone-300"
                >
                  {saving ? "저장 중…" : "저장하고 링크 만들기"}
                </button>
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
