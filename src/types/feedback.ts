export type FeedbackStatus = "new" | "resolved";

export type PlaceFeedbackCategory = "잘못된 정보" | "폐업/이전" | "부적절한 장소" | "기타";

export interface PlaceFeedback {
  id: string;
  place_id: string;
  category: PlaceFeedbackCategory;
  message: string;
  status: FeedbackStatus;
  created_at: string;
}

export interface SiteFeedback {
  id: string;
  message: string;
  status: FeedbackStatus;
  created_at: string;
}

export interface CourseSuggestion {
  id: string;
  nickname: string | null;
  content: string;
  status: FeedbackStatus;
  created_at: string;
}

export interface BusinessInquiry {
  id: string;
  business_name: string;
  contact: string;
  message: string;
  status: FeedbackStatus;
  created_at: string;
}
