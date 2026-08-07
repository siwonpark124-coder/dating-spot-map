-- 사용자가 짠 데이트 코스. 로그인이 없으므로 소유자 개념 대신
-- "링크를 아는 사람만 본다"로 간다. id는 URL에 그대로 쓰는 짧은 슬러그.
create table if not exists courses (
  id text primary key,
  title text,
  created_at timestamptz not null default now()
);

-- 코스의 한 정거장.
-- place_id가 있으면 검수를 거친 큐레이션 장소, 없으면 카카오 검색으로 직접 추가한 지점
-- (전시회·공원 등). 후자는 places를 오염시키지 않도록 좌표와 이름만 여기 둔다.
create table if not exists course_stops (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references courses(id) on delete cascade,
  position smallint not null check (position between 1 and 4),
  place_id uuid references places(id) on delete set null,
  -- place_id가 있어도 그 장소가 나중에 제외되면 코스가 깨지므로 좌표·이름을 함께 저장한다
  lat double precision not null,
  lng double precision not null,
  label text not null,
  unique (course_id, position)
);

create index if not exists course_stops_course_id_idx on course_stops (course_id);

alter table courses enable row level security;
alter table course_stops enable row level security;

-- 링크를 아는 사람은 볼 수 있고, 누구나 새로 만들 수 있다.
-- 수정·삭제 정책은 두지 않는다 (한번 저장한 코스는 불변, 바꾸려면 새로 저장).
create policy "Public read courses" on courses for select using (true);
create policy "Public create courses" on courses for insert with check (true);
create policy "Public read course stops" on course_stops for select using (true);
create policy "Public create course stops" on course_stops for insert with check (true);
