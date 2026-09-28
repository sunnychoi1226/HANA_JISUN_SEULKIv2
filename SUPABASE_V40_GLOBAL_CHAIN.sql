-- V40: 글로벌 체인 판정 근거를 호텔 데이터에 명시적으로 저장
-- is_global_chain은 true/false/null(미확인) 3상태로 사용한다.

create table if not exists public.hotel_verifications (
  hotel_key text primary key,
  hotel_name text not null,
  city text not null default '',
  country text not null default '',
  official_name text,
  star_rating numeric,
  total_rooms numeric,
  largest_event_capacity numeric,
  official_url text,
  group_sales_email text,
  address text,
  notes text,
  sources jsonb not null default '[]'::jsonb,
  verified_at timestamptz not null default now(),
  verified_by text
);

create index if not exists hotel_verifications_city_idx
  on public.hotel_verifications(city);

alter table public.hotel_verifications enable row level security;
grant select, insert, update, delete on public.hotel_verifications to service_role;

alter table public.hotels
  add column if not exists brand_name text,
  add column if not exists parent_chain text,
  add column if not exists is_global_chain boolean,
  add column if not exists chain_source_url text,
  add column if not exists chain_verified_at timestamptz;

alter table public.hotel_discovery_cache
  add column if not exists brand_name text,
  add column if not exists parent_chain text,
  add column if not exists is_global_chain boolean,
  add column if not exists chain_source_url text,
  add column if not exists chain_verified_at timestamptz;

alter table public.hotel_verifications
  add column if not exists brand_name text,
  add column if not exists parent_chain text,
  add column if not exists is_global_chain boolean,
  add column if not exists chain_source_url text,
  add column if not exists chain_verified_at timestamptz;

comment on column public.hotels.is_global_chain is
  '공식 브랜드/체인 근거로 확인한 글로벌 체인 여부. null은 미확인.';
comment on column public.hotel_discovery_cache.is_global_chain is
  '공식 브랜드/체인 근거로 확인한 글로벌 체인 여부. null은 미확인.';
comment on column public.hotel_verifications.is_global_chain is
  '공식 브랜드/체인 근거로 확인한 글로벌 체인 여부. null은 미확인.';
