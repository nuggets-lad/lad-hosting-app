create type public.website_status as enum (
  'active',
  'deploying',
  'generating',
  'waiting',
  'error',
  'updating'
);

create table public.websites (
  uuid uuid not null default gen_random_uuid (),
  domain text null,
  project_uuid text null,
  server_uuid text null,
  environment_uuid text null,
  app_uuid text null,
  payload text null,
  status public.website_status not null default 'waiting'::website_status,
  ref text null,
  brand text null,
  logo text null,
  banner text null,
  banner_mobile text null,
  image_1 text null,
  image_2 text null,
  image_3 text null,
  image_4 text null,
  admin_slug text null,
  admin_user text null,
  admin_password text null,
  api_key text null,
  pretty_link text null,
  login_button_text text null,
  register_button_text text null,
  bonus_button_text text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint websites_pkey primary key (uuid),
  constraint websites_domain_key unique (domain)
) TABLESPACE pg_default;

create trigger trg_websites_set_updated_at BEFORE
update on websites for EACH row
execute FUNCTION set_updated_at ();

create table public.websites_history (
  id bigserial not null,
  website_uuid uuid not null,
  data jsonb not null,
  changed_at timestamp with time zone not null default now(),
  constraint websites_history_pkey primary key (id),
  constraint websites_history_website_uuid_fkey foreign key (website_uuid) references websites (uuid) on delete cascade
) TABLESPACE pg_default;

create index IF not exists websites_history_site_changed_idx on public.websites_history using btree (website_uuid, changed_at desc) TABLESPACE pg_default;

create or replace function public.fn_upsert_website(p_data jsonb)
returns websites
language plpgsql
as $$
DECLARE
  v_uuid uuid := NULLIF(p_data->>'uuid', '')::uuid;
  v_domain text := NULLIF(p_data->>'domain', '');
  v_existing websites;
  v_result websites;
  v_payload text := COALESCE(NULLIF(p_data->>'payload', ''), NULLIF(p_data->>'code', ''));
BEGIN
  IF v_uuid IS NOT NULL THEN
    SELECT * INTO v_existing FROM websites WHERE uuid = v_uuid;
  ELSIF v_domain IS NOT NULL THEN
    SELECT * INTO v_existing FROM websites WHERE domain = v_domain;
  ELSE
    RAISE EXCEPTION 'Either uuid or domain is required';
  END IF;

  IF v_existing.uuid IS NULL AND v_uuid IS NULL THEN
    v_uuid := gen_random_uuid();
  ELSIF v_existing.uuid IS NOT NULL THEN
    v_uuid := v_existing.uuid;
  END IF;

  IF v_existing.uuid IS NULL THEN
    IF v_domain IS NULL THEN
      RAISE EXCEPTION 'domain is required for new website records';
    END IF;

    INSERT INTO websites (
      uuid, domain, project_uuid, server_uuid, environment_uuid, app_uuid,
      payload, status, ref, brand, logo, banner, banner_mobile,
      image_1, image_2, image_3, image_4,
      admin_slug, admin_user, admin_password, api_key, pretty_link,
      login_button_text, register_button_text, bonus_button_text
    )
    VALUES (
      v_uuid,
      v_domain,
      NULLIF(p_data->>'project_uuid', ''),
      NULLIF(p_data->>'server_uuid', ''),
      NULLIF(p_data->>'environment_uuid', ''),
      NULLIF(p_data->>'app_uuid', ''),
      v_payload,
      COALESCE(NULLIF(p_data->>'status', '')::website_status, 'waiting'),
      NULLIF(p_data->>'ref', ''),
      NULLIF(p_data->>'brand', ''),
      NULLIF(p_data->>'logo', ''),
      NULLIF(p_data->>'banner', ''),
      NULLIF(p_data->>'banner_mobile', ''),
      NULLIF(p_data->>'image_1', ''),
      NULLIF(p_data->>'image_2', ''),
      NULLIF(p_data->>'image_3', ''),
      NULLIF(p_data->>'image_4', ''),
      NULLIF(p_data->>'admin_slug', ''),
      NULLIF(p_data->>'admin_user', ''),
      NULLIF(p_data->>'admin_password', ''),
      NULLIF(p_data->>'api_key', ''),
      NULLIF(p_data->>'pretty_link', ''),
      NULLIF(p_data->>'login_button_text', ''),
      NULLIF(p_data->>'register_button_text', ''),
      NULLIF(p_data->>'bonus_button_text', '')
    )
    RETURNING * INTO v_result;
  ELSE
    UPDATE websites SET
      domain = COALESCE(v_domain, domain),
      project_uuid = COALESCE(
        CASE WHEN p_data ? 'project_uuid' AND p_data->>'project_uuid' IS NOT NULL THEN NULLIF(p_data->>'project_uuid', '') END,
        project_uuid
      ),
      server_uuid = COALESCE(
        CASE WHEN p_data ? 'server_uuid' AND p_data->>'server_uuid' IS NOT NULL THEN NULLIF(p_data->>'server_uuid', '') END,
        server_uuid
      ),
      environment_uuid = COALESCE(
        CASE WHEN p_data ? 'environment_uuid' AND p_data->>'environment_uuid' IS NOT NULL THEN NULLIF(p_data->>'environment_uuid', '') END,
        environment_uuid
      ),
      app_uuid = COALESCE(
        CASE WHEN p_data ? 'app_uuid' AND p_data->>'app_uuid' IS NOT NULL THEN NULLIF(p_data->>'app_uuid', '') END,
        app_uuid
      ),
      payload = COALESCE(
        CASE WHEN v_payload IS NOT NULL THEN v_payload END,
        payload
      ),
      status = COALESCE(
        CASE WHEN p_data ? 'status' AND p_data->>'status' IS NOT NULL THEN NULLIF(p_data->>'status', '')::website_status END,
        status
      ),
      ref = COALESCE(
        CASE WHEN p_data ? 'ref' AND p_data->>'ref' IS NOT NULL THEN NULLIF(p_data->>'ref', '') END,
        ref
      ),
      brand = COALESCE(
        CASE WHEN p_data ? 'brand' AND p_data->>'brand' IS NOT NULL THEN NULLIF(p_data->>'brand', '') END,
        brand
      ),
      logo = COALESCE(
        CASE WHEN p_data ? 'logo' AND p_data->>'logo' IS NOT NULL THEN NULLIF(p_data->>'logo', '') END,
        logo
      ),
      banner = COALESCE(
        CASE WHEN p_data ? 'banner' AND p_data->>'banner' IS NOT NULL THEN NULLIF(p_data->>'banner', '') END,
        banner
      ),
      banner_mobile = COALESCE(
        CASE WHEN p_data ? 'banner_mobile' AND p_data->>'banner_mobile' IS NOT NULL THEN NULLIF(p_data->>'banner_mobile', '') END,
        banner_mobile
      ),
      image_1 = COALESCE(
        CASE WHEN p_data ? 'image_1' AND p_data->>'image_1' IS NOT NULL THEN NULLIF(p_data->>'image_1', '') END,
        image_1
      ),
      image_2 = COALESCE(
        CASE WHEN p_data ? 'image_2' AND p_data->>'image_2' IS NOT NULL THEN NULLIF(p_data->>'image_2', '') END,
        image_2
      ),
      image_3 = COALESCE(
        CASE WHEN p_data ? 'image_3' AND p_data->>'image_3' IS NOT NULL THEN NULLIF(p_data->>'image_3', '') END,
        image_3
      ),
      image_4 = COALESCE(
        CASE WHEN p_data ? 'image_4' AND p_data->>'image_4' IS NOT NULL THEN NULLIF(p_data->>'image_4', '') END,
        image_4
      ),
      admin_slug = COALESCE(
        CASE WHEN p_data ? 'admin_slug' AND p_data->>'admin_slug' IS NOT NULL THEN NULLIF(p_data->>'admin_slug', '') END,
        admin_slug
      ),
      admin_user = COALESCE(
        CASE WHEN p_data ? 'admin_user' AND p_data->>'admin_user' IS NOT NULL THEN NULLIF(p_data->>'admin_user', '') END,
        admin_user
      ),
      admin_password = COALESCE(
        CASE WHEN p_data ? 'admin_password' AND p_data->>'admin_password' IS NOT NULL THEN NULLIF(p_data->>'admin_password', '') END,
        admin_password
      ),
      api_key = COALESCE(
        CASE WHEN p_data ? 'api_key' AND p_data->>'api_key' IS NOT NULL THEN NULLIF(p_data->>'api_key', '') END,
        api_key
      ),
      pretty_link = COALESCE(
        CASE WHEN p_data ? 'pretty_link' AND p_data->>'pretty_link' IS NOT NULL THEN NULLIF(p_data->>'pretty_link', '') END,
        pretty_link
      ),
      login_button_text = COALESCE(
        CASE WHEN p_data ? 'login_button_text' AND p_data->>'login_button_text' IS NOT NULL THEN NULLIF(p_data->>'login_button_text', '') END,
        login_button_text
      ),
      register_button_text = COALESCE(
        CASE WHEN p_data ? 'register_button_text' AND p_data->>'register_button_text' IS NOT NULL THEN NULLIF(p_data->>'register_button_text', '') END,
        register_button_text
      ),
      bonus_button_text = COALESCE(
        CASE WHEN p_data ? 'bonus_button_text' AND p_data->>'bonus_button_text' IS NOT NULL THEN NULLIF(p_data->>'bonus_button_text', '') END,
        bonus_button_text
      )
    WHERE uuid = v_uuid
    RETURNING * INTO v_result;
  END IF;

  INSERT INTO websites_history (website_uuid, data)
  VALUES (v_result.uuid, to_jsonb(v_result));

  DELETE FROM websites_history
  WHERE website_uuid = v_result.uuid
    AND id NOT IN (
      SELECT id FROM websites_history
      WHERE website_uuid = v_result.uuid
      ORDER BY changed_at DESC
      LIMIT 20
    );

  RETURN v_result;
END;
$$;
