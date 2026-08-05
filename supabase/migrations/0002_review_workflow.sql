-- 자동 수집 데이터용 검수 워크플로우: pending_review로 들어온 뒤 사람이 확인해야 published로 공개됨
-- 기본값은 published: SQL Editor로 직접 넣는 수동 등록은 그대로 바로 노출되고,
-- 자동 수집 스크립트만 insert 시 status='pending_review'를 명시적으로 지정함

alter table places add column if not exists status text not null default 'published'
  check (status in ('pending_review', 'published'));

alter table places alter column curation_note drop not null;
alter table places alter column price_tier drop not null;

-- 카카오 로컬 API로 수집할 때 중복 삽입 방지용
alter table places add column if not exists kakao_place_id text unique;

create index if not exists places_status_idx on places (status);

-- 공개 조회는 published인 것만 노출 (pending_review는 대시보드/서비스 롤에서만 보임)
drop policy if exists "Public read access" on places;

create policy "Public read access"
  on places for select
  using (status = 'published');
