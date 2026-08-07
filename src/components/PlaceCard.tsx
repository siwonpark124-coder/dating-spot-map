import { memo } from "react";
import Link from "next/link";
import { PlaceWithReviewCount } from "@/types/place";
import { CATEGORY_LABELS, PRICE_TIER_LABELS } from "@/lib/constants";

interface PlaceCardProps {
  place: PlaceWithReviewCount;
  selected?: boolean;
  /** 코스에 이미 담겼는지. 코스 기능이 없는 화면에서는 넘기지 않는다. */
  inCourse?: boolean;
  courseFull?: boolean;
  onAddToCourse?: (place: PlaceWithReviewCount) => void;
}

function PlaceCard({ place, selected = false, inCourse, courseFull, onAddToCourse }: PlaceCardProps) {
  return (
    <article
      data-place-id={place.id}
      className={`flex scroll-mt-3 gap-3 rounded-lg border bg-white p-3 transition-colors ${
        selected ? "border-amber-700 ring-2 ring-amber-700/30" : "border-stone-200"
      }`}
    >
      {place.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={place.cover_image_url}
          alt={place.name}
          className="h-24 w-24 flex-shrink-0 rounded-md object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-1">
        <Link href={`/place/${place.id}`} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-stone-900 hover:underline">{place.name}</h2>
            <span className="text-xs text-stone-500">
              {place.cuisine ? `${place.cuisine} ${CATEGORY_LABELS[place.category]}` : CATEGORY_LABELS[place.category]}
              {place.price_tier && ` · ${PRICE_TIER_LABELS[place.price_tier]}`}
            </span>
          </div>

          {place.mood_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {place.mood_tags.map((tag) => (
                <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {place.curation_note && <p className="line-clamp-2 text-sm text-stone-700">{place.curation_note}</p>}
          {place.business_hours && <p className="text-xs text-stone-500">{place.business_hours}</p>}
        </Link>

        <div className="mt-1 flex items-center gap-3 text-xs">
          <Link href={`/place/${place.id}`} className="text-stone-500 hover:underline">
            후기 {place.review_count}개
          </Link>
          {/* 사진·메뉴는 DB에 없어서 카카오맵으로 넘긴다 */}
          {place.kakao_map_url && (
            <a href={place.kakao_map_url} target="_blank" rel="noreferrer" className="text-amber-700 underline">
              사진·메뉴
            </a>
          )}
          {place.naver_map_url && (
            <a href={place.naver_map_url} target="_blank" rel="noreferrer" className="text-amber-700 underline">
              길찾기
            </a>
          )}
          {place.reservation_url && (
            <a href={place.reservation_url} target="_blank" rel="noreferrer" className="text-stone-700 underline">
              예약
            </a>
          )}

          {onAddToCourse && (
            <button
              type="button"
              onClick={() => onAddToCourse(place)}
              disabled={inCourse || courseFull}
              title={courseFull && !inCourse ? "코스가 가득 찼어요" : undefined}
              className={`ml-auto rounded-full border px-2.5 py-1 transition-colors ${
                inCourse
                  ? "border-amber-700 bg-amber-50 text-amber-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-100 disabled:opacity-40"
              }`}
            >
              {inCourse ? "코스에 담김" : "+ 코스"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// 필터가 바뀌면 목록 전체가 다시 그려지는데, 살아남은 카드는 내용이 그대로다.
// place 객체는 서버에서 온 뒤 바뀌지 않으므로 참조 비교만으로 충분히 걸러진다.
export default memo(PlaceCard);
