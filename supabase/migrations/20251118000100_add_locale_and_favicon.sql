alter table public.websites
  add column if not exists locale text,
  add column if not exists favicon text;

create or replace function public.fn_upsert_website(p_data jsonb)
returns websites
language plpgsql
as $$
declare
  v_uuid uuid := NULLIF(p_data->>'uuid', '')::uuid;
  v_domain text := NULLIF(p_data->>'domain', '');
  v_existing websites;
  v_result websites;
  v_payload text := COALESCE(NULLIF(p_data->>'payload', ''), NULLIF(p_data->>'code', ''));
begin
  if v_uuid is not null then
    select * into v_existing from websites where uuid = v_uuid;
  elsif v_domain is not null then
    select * into v_existing from websites where domain = v_domain;
  else
    raise exception 'Either uuid or domain is required';
  end if;

  if v_existing.uuid is null and v_uuid is null then
    v_uuid := gen_random_uuid();
  elsif v_existing.uuid is not null then
    v_uuid := v_existing.uuid;
  end if;

  if v_existing.uuid is null then
    if v_domain is null then
      raise exception 'domain is required for new website records';
    end if;

    insert into websites (
      uuid, domain, project_uuid, server_uuid, environment_uuid, app_uuid,
      payload, status, ref, brand, logo, banner, banner_mobile,
      image_1, image_2, image_3, image_4, favicon,
      admin_slug, admin_user, admin_password, api_key, pretty_link,
      login_button_text, register_button_text, bonus_button_text,
      publisher, brand_full, brand_key, target_site, style,
      locale
    )
    values (
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
      NULLIF(p_data->>'favicon', ''),
      NULLIF(p_data->>'admin_slug', ''),
      NULLIF(p_data->>'admin_user', ''),
      NULLIF(p_data->>'admin_password', ''),
      NULLIF(p_data->>'api_key', ''),
      NULLIF(p_data->>'pretty_link', ''),
      NULLIF(p_data->>'login_button_text', ''),
      NULLIF(p_data->>'register_button_text', ''),
      NULLIF(p_data->>'bonus_button_text', ''),
      NULLIF(p_data->>'publisher', ''),
      NULLIF(p_data->>'brand_full', ''),
      NULLIF(p_data->>'brand_key', ''),
      NULLIF(p_data->>'target_site', ''),
      NULLIF(p_data->>'style', ''),
      NULLIF(p_data->>'locale', '')
    )
    returning * into v_result;
  else
    update websites set
      domain = COALESCE(v_domain, domain),
      project_uuid = COALESCE(
        case when p_data ? 'project_uuid' and p_data->>'project_uuid' is not null then NULLIF(p_data->>'project_uuid', '') end,
        project_uuid
      ),
      server_uuid = COALESCE(
        case when p_data ? 'server_uuid' and p_data->>'server_uuid' is not null then NULLIF(p_data->>'server_uuid', '') end,
        server_uuid
      ),
      environment_uuid = COALESCE(
        case when p_data ? 'environment_uuid' and p_data->>'environment_uuid' is not null then NULLIF(p_data->>'environment_uuid', '') end,
        environment_uuid
      ),
      app_uuid = COALESCE(
        case when p_data ? 'app_uuid' and p_data->>'app_uuid' is not null then NULLIF(p_data->>'app_uuid', '') end,
        app_uuid
      ),
      payload = COALESCE(
        case when v_payload is not null then v_payload end,
        payload
      ),
      status = COALESCE(
        case when p_data ? 'status' and p_data->>'status' is not null then NULLIF(p_data->>'status', '')::website_status end,
        status
      ),
      ref = COALESCE(
        case when p_data ? 'ref' and p_data->>'ref' is not null then NULLIF(p_data->>'ref', '') end,
        ref
      ),
      brand = COALESCE(
        case when p_data ? 'brand' and p_data->>'brand' is not null then NULLIF(p_data->>'brand', '') end,
        brand
      ),
      logo = COALESCE(
        case when p_data ? 'logo' and p_data->>'logo' is not null then NULLIF(p_data->>'logo', '') end,
        logo
      ),
      banner = COALESCE(
        case when p_data ? 'banner' and p_data->>'banner' is not null then NULLIF(p_data->>'banner', '') end,
        banner
      ),
      banner_mobile = COALESCE(
        case when p_data ? 'banner_mobile' and p_data->>'banner_mobile' is not null then NULLIF(p_data->>'banner_mobile', '') end,
        banner_mobile
      ),
      image_1 = COALESCE(
        case when p_data ? 'image_1' and p_data->>'image_1' is not null then NULLIF(p_data->>'image_1', '') end,
        image_1
      ),
      image_2 = COALESCE(
        case when p_data ? 'image_2' and p_data->>'image_2' is not null then NULLIF(p_data->>'image_2', '') end,
        image_2
      ),
      image_3 = COALESCE(
        case when p_data ? 'image_3' and p_data->>'image_3' is not null then NULLIF(p_data->>'image_3', '') end,
        image_3
      ),
      image_4 = COALESCE(
        case when p_data ? 'image_4' and p_data->>'image_4' is not null then NULLIF(p_data->>'image_4', '') end,
        image_4
      ),
      favicon = COALESCE(
        case when p_data ? 'favicon' and p_data->>'favicon' is not null then NULLIF(p_data->>'favicon', '') end,
        favicon
      ),
      admin_slug = COALESCE(
        case when p_data ? 'admin_slug' and p_data->>'admin_slug' is not null then NULLIF(p_data->>'admin_slug', '') end,
        admin_slug
      ),
      admin_user = COALESCE(
        case when p_data ? 'admin_user' and p_data->>'admin_user' is not null then NULLIF(p_data->>'admin_user', '') end,
        admin_user
      ),
      admin_password = COALESCE(
        case when p_data ? 'admin_password' and p_data->>'admin_password' is not null then NULLIF(p_data->>'admin_password', '') end,
        admin_password
      ),
      api_key = COALESCE(
        case when p_data ? 'api_key' and p_data->>'api_key' is not null then NULLIF(p_data->>'api_key', '') end,
        api_key
      ),
      pretty_link = COALESCE(
        case when p_data ? 'pretty_link' and p_data->>'pretty_link' is not null then NULLIF(p_data->>'pretty_link', '') end,
        pretty_link
      ),
      login_button_text = COALESCE(
        case when p_data ? 'login_button_text' and p_data->>'login_button_text' is not null then NULLIF(p_data->>'login_button_text', '') end,
        login_button_text
      ),
      register_button_text = COALESCE(
        case when p_data ? 'register_button_text' and p_data->>'register_button_text' is not null then NULLIF(p_data->>'register_button_text', '') end,
        register_button_text
      ),
      bonus_button_text = COALESCE(
        case when p_data ? 'bonus_button_text' and p_data->>'bonus_button_text' is not null then NULLIF(p_data->>'bonus_button_text', '') end,
        bonus_button_text
      ),
      publisher = COALESCE(
        case when p_data ? 'publisher' and p_data->>'publisher' is not null then NULLIF(p_data->>'publisher', '') end,
        publisher
      ),
      brand_full = COALESCE(
        case when p_data ? 'brand_full' and p_data->>'brand_full' is not null then NULLIF(p_data->>'brand_full', '') end,
        brand_full
      ),
      brand_key = COALESCE(
        case when p_data ? 'brand_key' and p_data->>'brand_key' is not null then NULLIF(p_data->>'brand_key', '') end,
        brand_key
      ),
      target_site = COALESCE(
        case when p_data ? 'target_site' and p_data->>'target_site' is not null then NULLIF(p_data->>'target_site', '') end,
        target_site
      ),
      style = COALESCE(
        case when p_data ? 'style' and p_data->>'style' is not null then NULLIF(p_data->>'style', '') end,
        style
      ),
      locale = COALESCE(
        case when p_data ? 'locale' and p_data->>'locale' is not null then NULLIF(p_data->>'locale', '') end,
        locale
      )
    where uuid = v_uuid
    returning * into v_result;
  end if;

  insert into websites_history (website_uuid, data)
  values (v_result.uuid, to_jsonb(v_result));

  delete from websites_history
  where website_uuid = v_result.uuid
    and id not in (
      select id from websites_history
      where website_uuid = v_result.uuid
      order by changed_at desc
      limit 20
    );

  return v_result;
end;
$$;
