"use client";

import { useState } from "react";
import Link from "next/link";
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

export interface CourseTrayBodyProps {
  stops: CourseStop[];
  onChange: (stops: CourseStop[]) => void;
  /**
   * 저장/등록. 성공하면 코스 id를, 실패하면 보여줄 이유를 돌려준다.
   * curate 모드에서만 subtitle을 쓴다.
   */
  onSave: (title: string, subtitle: string) => Promise<{ id: string } | { error: string }>;
  /** "save" = 사용자가 링크를 만든다, "curate" = 관리자가 추천 코스로 등록한다 */
  mode?: "save" | "curate";
  /** 추천 코스를 불러왔을 때 그 이름을 코스 이름 칸에 미리 채워둔다 */
  initialTitle?: string;
  /** 실제 보행 경로. 있으면 그 시간을, 없으면 직선 추정치를 보여준다. */
  walkLegs?: { meters: number | null; minutes: number | null }[];
  /** 지도 선만 직선인 상태 (거리·시간은 정확할 수 있다) */
  walkNoPath?: boolean;
  /** 거리·시간까지 추정치인 상태 */
  walkNoDistance?: boolean;
  walkLoading?: boolean;
  onRetryWalk?: () => void;
}

/**
 * 코스 편집 본문. 데스크탑은 화면 아래 고정 패널로, 모바일은 시트 안에 넣어 같은 걸 쓴다.
 */
export function CourseTrayBody({
  stops,
  onChange,
  onSave,
  mode = "save",
  initialTitle = "",
  walkLegs,
  walkLoading,
  walkNoPath,
  walkNoDistance,
  onRetryWalk,
}: CourseTrayBodyProps) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const curating = mode === "curate";
  const legs = courseLegs(stops, walkLegs);
  const isFull = stops.length >= MAX_STOPS;
  const tooShort = stops.length < 2;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await onSave(title.trim(), subtitle.trim());
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (curating) setRegistered(true);
      else setSavedUrl(`${window.location.origin}/course/${result.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ol className="flex flex-col gap-1.5">
        {stops.map((stop, i) => (
          <li key={`${stop.placeId ?? "pin"}-${stop.lat}-${stop.lng}`} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2">
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

      {walkNoPath && !walkLoading && (
        <p className="flex items-center gap-2 rounded-lg bg-stone-100 px-2.5 py-2 text-xs text-stone-600">
          {walkNoDistance
            ? "보행 경로를 못 받았어요. 지도의 선과 시간·거리 모두 직선 기준 추정치예요."
            : "지도에는 직선으로 그렸지만, 시간·거리는 실제 보행로 기준이에요."}
          {onRetryWalk && (
            <button type="button" onClick={onRetryWalk} className="underline hover:text-stone-800">
              다시 시도
            </button>
          )}
        </p>
      )}

      <CourseSearchBox disabled={isFull} onPick={(stop) => onChange([...stops, stop])} />

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
      ) : registered ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-stone-100 p-2.5">
          <p className="text-xs text-stone-600">
            추천 코스로 등록했어요. 첫 화면의 &lsquo;추천 코스&rsquo;에 바로 뜹니다.
          </p>
          <div className="flex shrink-0 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setRegistered(false);
                setTitle("");
                setSubtitle("");
                onChange([]);
              }}
              className="text-stone-600 underline hover:text-stone-800"
            >
              새 코스 짜기
            </button>
            <Link href="/review/curated" className="text-amber-700 underline hover:text-amber-900">
              목록으로
            </Link>
          </div>
        </div>
      ) : curating ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
              placeholder="코스 이름 (필수) — 예: 성수 저녁 3시간"
              className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || tooShort || !title.trim()}
              title={tooShort ? "두 곳 이상 담아야 코스가 돼요" : undefined}
              className="shrink-0 rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white hover:bg-amber-900 disabled:bg-stone-300"
            >
              {saving ? "등록 중…" : "추천 코스로 등록"}
            </button>
          </div>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={60}
            placeholder="한 줄 설명 (선택) — 예: 조용히 얘기하기 좋은 조합"
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={40}
            placeholder="코스 이름 (선택)"
            className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || tooShort}
            title={tooShort ? "두 곳 이상 담아야 코스가 돼요" : undefined}
            className="shrink-0 rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white hover:bg-amber-900 disabled:bg-stone-300"
          >
            {saving ? "저장 중…" : "저장하고 링크 만들기"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </>
  );
}

/** 데스크탑 전용 하단 고정 패널. 모바일은 얇은 바 + 시트를 쓴다. */
export default function CourseTray(props: CourseTrayBodyProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { stops, onChange, walkLegs, walkLoading } = props;

  if (stops.length === 0) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 hidden border-t border-stone-300 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:block">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">
            {props.mode === "curate" ? "추천 코스" : "내 코스"} {stops.length}/{MAX_STOPS}
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

        {!collapsed && <CourseTrayBody {...props} />}
      </div>
    </div>
  );
}
