-- V40: 호텔명에서 공식 홈페이지로 직접 연결하기 위한 Master 컬럼
alter table public.hotels
  add column if not exists official_url text,
  add column if not exists official_url_verified_at timestamptz;

comment on column public.hotels.official_url is
  '호텔 또는 공식 호텔 체인에서 운영하는 해당 호텔의 공식 홈페이지 URL';
