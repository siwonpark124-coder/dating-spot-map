-- 사용자가 직접 신청한 장소. 수집 스크립트가 넣은 것과 섞이면
-- 검수할 때 "누가 왜 넣었는지"를 알 수 없어 구분 칸을 둔다.
alter table places
  add column if not exists submitted_by_user boolean not null default false,
  -- 신청자가 남긴 한 줄 이유. 검수할 때 추천 이유를 쓰는 실마리가 된다.
  add column if not exists submission_note text;

-- 검수 화면에서 사용자 신청분을 먼저 보고 싶을 때가 있다 (기다리는 사람이 있으므로).
create index if not exists places_user_submitted_idx
  on places (created_at)
  where submitted_by_user and status = 'pending_review';

comment on column places.submitted_by_user is
  '사용자가 신청 폼으로 넣은 장소. 수집 스크립트가 넣은 것과 구분한다.';
