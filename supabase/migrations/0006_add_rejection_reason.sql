-- 제외(rejected) 처리 시 사유를 기록하고, 제외 목록을 다시 검토/복구할 수 있도록 컬럼 추가
alter table places add column if not exists rejection_reason text;
