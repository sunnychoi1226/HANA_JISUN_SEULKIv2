-- V27 검증 캐시 확장 컬럼
alter table public.hotel_discovery_cache add column if not exists total_rooms integer;
alter table public.hotel_discovery_cache add column if not exists has_event_space boolean;
alter table public.hotel_discovery_cache add column if not exists largest_event_capacity integer;
alter table public.hotel_discovery_cache add column if not exists meeting_rooms integer;
alter table public.hotel_discovery_cache add column if not exists group_sales_contact text;
alter table public.hotel_discovery_cache add column if not exists tags jsonb default '[]'::jsonb;
alter table public.hotel_discovery_cache add column if not exists verification_status text default 'pending';
alter table public.hotel_discovery_cache add column if not exists source_url text;
alter table public.hotel_discovery_cache add column if not exists source_urls jsonb default '[]'::jsonb;
alter table public.hotel_discovery_cache add column if not exists verified_at timestamptz;
alter table public.hotel_discovery_cache add column if not exists verified_by text;
alter table public.hotel_discovery_cache add column if not exists verification_note text;
