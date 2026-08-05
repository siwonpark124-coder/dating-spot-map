import { MoodTag, PlaceCategory } from "@/types/place";

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  restaurant: "식당",
  cafe: "카페",
  bar: "바",
};

export const MOOD_TAGS: MoodTag[] = ["조용함", "캐주얼", "무드있는", "뷰맛집", "프라이빗"];

export const NEIGHBORHOODS = ["연남", "종로", "을지로", "용산", "성수", "강남"] as const;

// 카카오 로컬 API로 동네별 장소를 검색할 때 기준으로 쓰는 중심 좌표 (반경 검색용)
export const NEIGHBORHOOD_SEARCH_CENTERS: Record<(typeof NEIGHBORHOODS)[number], { lat: number; lng: number }> = {
  연남: { lat: 37.5615, lng: 126.9254 },
  종로: { lat: 37.5704, lng: 126.9910 },
  을지로: { lat: 37.5663, lng: 126.9910 },
  용산: { lat: 37.5298, lng: 126.9648 },
  성수: { lat: 37.5445, lng: 127.0559 },
  강남: { lat: 37.4979, lng: 127.0276 },
};

export const PRICE_TIER_LABELS: Record<1 | 2 | 3, string> = {
  1: "~3만원",
  2: "3~5만원",
  3: "5만원~",
};
