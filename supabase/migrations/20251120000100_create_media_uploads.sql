create table public.media_uploads (
  id uuid not null default gen_random_uuid (),
  filename text not null,
  url text not null,
  website_uuid uuid null,
  created_at timestamp with time zone not null default now(),
  constraint media_uploads_pkey primary key (id),
  constraint media_uploads_website_uuid_fkey foreign key (website_uuid) references websites (uuid) on delete set null
) TABLESPACE pg_default;

create index IF not exists media_uploads_website_uuid_idx on public.media_uploads using btree (website_uuid) TABLESPACE pg_default;
create index IF not exists media_uploads_filename_idx on public.media_uploads using btree (filename) TABLESPACE pg_default;
