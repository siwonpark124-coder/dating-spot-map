export type PlaceCategory = "restaurant" | "cafe" | "bar";

export type MoodTag = "조용함" | "캐주얼" | "무드있는" | "뷰맛집" | "프라이빗";

export type PlaceStatus = "pending_review" | "published" | "rejected";

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  price_tier: 1 | 2 | 3 | null;
  mood_tags: MoodTag[];
  curation_note: string | null;
  business_hours: string | null;
  cover_image_url: string | null;
  kakao_map_url: string | null;
  naver_map_url: string | null;
  naver_place_url: string | null;
  reservation_url: string | null;
  status: PlaceStatus;
  kakao_place_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceWithReviewCount extends Place {
  review_count: number;
}
