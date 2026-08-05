"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlaceWithReviewCount, MoodTag } from "@/types/place";
import KakaoMap from "./KakaoMap";
import PlaceCard from "./PlaceCard";
import Filters, { CategoryFilter, NeighborhoodFilter } from "./Filters";

type SortOption = "latest" | "popular";

export default function PlaceExplorer({ places }: { places: PlaceWithReviewCount[] }) {
  const [neighborhood, setNeighborhood] = useState<NeighborhoodFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [moodTags, setMoodTags] = useState<MoodTag[]>([]);
  const [priceTiers, setPriceTiers] = useState<(1 | 2 | 3)[]>([]);
  const [sort, setSort] = useState<SortOption>("latest");

  const filteredPlaces = useMemo(() => {
    const filtered = places.filter((place) => {
      const matchesNeighborhood = neighborhood === "all" || place.neighborhood === neighborhood;
      const matchesCategory = category === "all" || place.category === category;
      const matchesMood = moodTags.length === 0 || moodTags.some((tag) => place.mood_tags.includes(tag));
      const matchesPrice =
        priceTiers.length === 0 || (place.price_tier !== null && priceTiers.includes(place.price_tier));
      return matchesNeighborhood && matchesCategory && matchesMood && matchesPrice;
    });

    if (sort === "popular") {
      return [...filtered].sort((a, b) => b.review_count - a.review_count);
    }
    return filtered;
  }, [places, neighborhood, category, moodTags, priceTiers, sort]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-4 border-b border-stone-200 bg-[#fbf7ef] px-6 py-5">
        <h1 className="shrink-0 text-xl font-bold text-stone-900">소개팅 장소 지도</h1>
        <Filters
          neighborhood={neighborhood}
          onNeighborhoodChange={setNeighborhood}
          category={category}
          onCategoryChange={setCategory}
          moodTags={moodTags}
          onMoodTagsChange={setMoodTags}
          priceTiers={priceTiers}
          onPriceTiersChange={setPriceTiers}
        />
        <Link href="/feedback" className="shrink-0 text-sm text-stone-500 underline hover:text-stone-700">
          피드백 남기기
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="min-h-[50vh] flex-1 md:min-h-0">
          <KakaoMap places={filteredPlaces} />
        </div>

        <div className="flex w-full shrink-0 flex-col overflow-y-auto border-t border-stone-200 bg-[#fbf7ef] md:w-[380px] md:border-t-0 md:border-l">
          <div className="flex shrink-0 gap-1.5 border-b border-stone-200 p-3">
            <button
              type="button"
              onClick={() => setSort("latest")}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                sort === "latest" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              최신순
            </button>
            <button
              type="button"
              onClick={() => setSort("popular")}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                sort === "popular" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              후기 많은순
            </button>
          </div>

          <div className="flex flex-col gap-3 p-3">
            {filteredPlaces.length === 0 && (
              <p className="text-sm text-stone-500">조건에 맞는 장소가 없어요.</p>
            )}
            {filteredPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
