-- V23 optional migration: keyword/tag governance
-- Existing tags remain exactly as uploaded.
alter table public.hotels
  add column if not exists tag_source text default 'manual',
  add column if not exists suggested_tags jsonb default '[]'::jsonb,
  add column if not exists tag_note text,
  add column if not exists tag_updated_at timestamptz;

-- Mark the current manually curated V21 tags as manual.
update public.hotels
set tag_source = coalesce(nullif(tag_source,''),'manual')
where tag_source is null or tag_source = '';
