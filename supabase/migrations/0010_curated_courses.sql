-- 운영자가 미리 짜둔 추천(큐레이션) 코스.
-- 별도 표를 두지 않고 courses에 표시 칸만 더한다. 코스 내용(course_stops)을
-- 그대로 재사용해야 관리자도 사용자와 똑같은 코스 작성 화면을 쓸 수 있다.
alter table courses
  -- 첫 화면 '추천 코스' 목록에 오르는 코스인지
  add column if not exists is_curated boolean not null default false,
  -- 버튼에 제목과 함께 붙는 한 줄 설명
  add column if not exists subtitle text,
  -- 목록에서의 노출 순서 (작을수록 위)
  add column if not exists sort_order integer not null default 0,
  -- 지우지 않고 목록에서만 내릴 때. 이미 공유된 /course/{id} 링크는 계속 열린다
  add column if not exists hidden boolean not null default false;

-- 첫 화면이 매 요청마다 읽는 목록이라 부분 인덱스를 둔다.
create index if not exists courses_curated_idx
  on courses (sort_order, created_at)
  where is_curated and not hidden;

-- 0009의 insert 정책은 "누구나 코스를 만들 수 있다"였다. 코스가 링크 뒤에만
-- 있을 때는 문제가 없었지만, 이제 is_curated가 켜진 코스는 첫 화면에 노출된다.
-- 공개 anon 키는 브라우저에 그대로 실리므로, 정책을 그대로 두면 누구나 DB에
-- 직접 요청을 보내 자기 코스를 추천 목록에 올릴 수 있다.
-- 사용자의 코스 저장은 그대로 두고, 추천 표시를 켜는 것만 막는다.
-- (관리자 등록은 RLS를 우회하는 service_role 키로만 이뤄진다.)
drop policy if exists "Public create courses" on courses;
create policy "Public create courses" on courses
  for insert with check (is_curated = false);

comment on column courses.is_curated is
  '운영자가 등록한 추천 코스. 공개 키로는 켤 수 없고 service_role로만 설정된다.';
