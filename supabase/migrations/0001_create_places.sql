-- 소개팅 장소 추천 서비스 - places 테이블 (MVP)

create table if not exists places (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  category text not null check (category in ('restaurant', 'cafe', 'bar')),
  neighborhood text not null,       -- 예: '홍대', '연남' — MVP는 1~2개 동네만 사용
  address text not null,

  lat double precision not null,
  lng double precision not null,

  price_tier smallint not null check (price_tier between 1 and 3), -- 1: ~3만원, 2: 3~5만원, 3: 5만원~

  -- 허용 태그(앱 코드에서 관리): 조용함 / 캐주얼 / 무드있는 / 뷰맛집 / 프라이빗
  mood_tags text[] not null default '{}',

  curation_note text not null,      -- 직접 쓰는 추천 이유, MVP 핵심 콘텐츠
  business_hours text,              -- 자유 텍스트, 예: '월-금 18:00-24:00, 주말 휴무'

  cover_image_url text,

  kakao_map_url text,
  naver_map_url text,
  naver_place_url text,
  reservation_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists places_neighborhood_idx on places (neighborhood);
create index if not exists places_category_idx on places (category);
create index if not exists places_mood_tags_idx on places using gin (mood_tags);

-- updated_at 자동 갱신
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger places_set_updated_at
  before update on places
  for each row
  execute function set_updated_at();

-- RLS: 누구나 조회 가능, 쓰기는 서비스 롤(관리자)만 — 익명 insert/update 정책 없음
alter table places enable row level security;

create policy "Public read access"
  on places for select
  using (true);
