-- 첫 만남(1차 소개팅)에 적합한 장소인지 표시.
-- false = 장소 자체는 유효하지만 1차 자리로는 부적합 (왁자지껄/무한리필/테이크아웃 위주 등).
-- 기본값 true이므로 기존 행은 모두 '적합'으로 시작하고, 부적합한 것만 명시적으로 내린다.
alter table places
  add column if not exists first_meeting_ok boolean not null default true;

-- 1차 적합 장소만 조회하는 필터가 주 사용처라 부분 인덱스로 충분하다.
create index if not exists places_first_meeting_ok_idx
  on places (first_meeting_ok)
  where first_meeting_ok = false;

comment on column places.first_meeting_ok is
  '첫 만남(1차) 소개팅 장소로 적합한지. false면 애프터/캐주얼 맥락에서만 노출.';
