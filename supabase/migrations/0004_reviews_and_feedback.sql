-- 장소별 후기 (닉네임+비밀번호, 디시인사이드 방식 — 별도 회원가입 없음)
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  nickname text not null,
  password_hash text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists reviews_place_id_idx on reviews (place_id);

alter table reviews enable row level security;

create policy "Public read reviews" on reviews for select using (true);
create policy "Public create reviews" on reviews for insert with check (true);
-- update/delete 정책 없음: 삭제는 서버 액션에서 비밀번호 해시 검증 후 service_role로 처리

-- 장소별 정보 신고 (잘못된 정보, 폐업 등) — 작성자는 볼 수 없고 운영자만 확인
create table if not exists place_feedback (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  category text not null check (category in ('잘못된 정보', '폐업/이전', '부적절한 장소', '기타')),
  message text not null,
  status text not null default 'new' check (status in ('new', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists place_feedback_place_id_idx on place_feedback (place_id);

alter table place_feedback enable row level security;

create policy "Public submit place feedback" on place_feedback for insert with check (true);
-- select 정책 없음: 운영자만 service_role로 확인

-- 사이트 전체에 대한 피드백
create table if not exists site_feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  status text not null default 'new' check (status in ('new', 'resolved')),
  created_at timestamptz not null default now()
);

alter table site_feedback enable row level security;

create policy "Public submit site feedback" on site_feedback for insert with check (true);
-- select 정책 없음: 운영자만 service_role로 확인
