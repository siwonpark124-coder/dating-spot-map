-- 식당 카드에 음식 종류(한식/일식/양식 등)를 표시하기 위한 컬럼 추가
alter table places add column if not exists cuisine text;
