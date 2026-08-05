-- 검수 화면에서 "제외" 처리한 장소를 표시하기 위한 상태 추가

alter table places drop constraint if exists places_status_check;

alter table places add constraint places_status_check
  check (status in ('pending_review', 'published', 'rejected'));
