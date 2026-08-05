"use client";

import { useState, useTransition } from "react";
import { Place } from "@/types/place";
import { CATEGORY_LABELS } from "@/lib/constants";
import { rejectPlace } from "@/app/review/actions";
import KakaoMap from "./KakaoMap";

export default function PendingPlacesMap({ initialPlaces }: { initialPlaces: Place[] }) {
  const [places, setPlaces] = useState(initialPlaces);
  const [selected, setSelected] = useState<Place | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReject(place: Place) {
    const formData = new FormData();
    formData.set("id", place.id);
    startTransition(async () => {
      await rejectPlace(formData);
      setPlaces((prev) => prev.filter((p) => p.id !== place.id));
      setSelected(null);
    });
  }

  return (
    <div className="relative h-full w-full">
      <KakaoMap places={places} onPlaceClick={setSelected} refitBoundsOnChange={false} />

      <p className="pointer-events-none absolute left-4 top-4 rounded bg-white/90 px-3 py-1.5 text-xs text-stone-600 shadow">
        검수 대기 {places.length}개 — 마커를 클릭해서 마음에 안 드는 곳을 바로 제외할 수 있어요
      </p>

      {selected && (
        <div className="absolute right-4 top-4 w-72 rounded-lg border border-stone-200 bg-white p-4 shadow-lg">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
          <h3 className="pr-4 font-semibold text-stone-900">{selected.name}</h3>
          <p className="mt-1 text-xs text-stone-500">
            {CATEGORY_LABELS[selected.category]} · {selected.neighborhood} · {selected.address}
          </p>
          {selected.kakao_map_url && (
            <a
              href={selected.kakao_map_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-amber-700 underline"
            >
              카카오맵에서 보기 →
            </a>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleReject(selected)}
            className="mt-3 w-full rounded-lg border border-red-300 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
          >
            이 장소 제외
          </button>
        </div>
      )}
    </div>
  );
}
