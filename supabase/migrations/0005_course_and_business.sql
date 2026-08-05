-- 사용자 데이트 코스 추천 제출
create table if not exists course_suggestions (
  id uuid primary key default gen_random_uuid(),
  nickname text,
  content text not null,
  status text not null default 'new' check (status in ('new', 'resolved')),
  created_at timestamptz not null default now()
);

alter table course_suggestions enable row level security;

create policy "Public submit course suggestions" on course_suggestions for insert with check (true);
-- select 정책 없음: 운영자만 service_role로 확인

-- 업주/비즈니스 협업 문의
create table if not exists business_inquiries (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'resolved')),
  created_at timestamptz not null default now()
);

alter table business_inquiries enable row level security;

create policy "Public submit business inquiries" on business_inquiries for insert with check (true);
-- select 정책 없음: 운영자만 service_role로 확인
