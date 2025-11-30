-- Add global code fields to websites table
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS global_code_after_head_open text,
ADD COLUMN IF NOT EXISTS global_code_after_body_open text;

-- Update fn_upsert_website to handle new fields
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
      image_1, image_2, image_3, image_4, favicon,
      admin_slug, admin_user, admin_password, api_key, pretty_link,
      login_button_text, register_button_text, bonus_button_text,
      publisher, brand_full, brand_key, target_site, style,
      locale,
      global_code_after_head_open, global_code_after_body_open
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
      NULLIF(p_data->>'locale', ''),
      NULLIF(p_data->>'global_code_after_head_open', ''),
      NULLIF(p_data->>'global_code_after_body_open', '')
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
      favicon = COALESCE(
        CASE WHEN p_data ? 'favicon' AND p_data->>'favicon' IS NOT NULL THEN NULLIF(p_data->>'favicon', '') END,
        favicon
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
      ),
      publisher = COALESCE(
        CASE WHEN p_data ? 'publisher' AND p_data->>'publisher' IS NOT NULL THEN NULLIF(p_data->>'publisher', '') END,
        publisher
      ),
      brand_full = COALESCE(
        CASE WHEN p_data ? 'brand_full' AND p_data->>'brand_full' IS NOT NULL THEN NULLIF(p_data->>'brand_full', '') END,
        brand_full
      ),
      brand_key = COALESCE(
        CASE WHEN p_data ? 'brand_key' AND p_data->>'brand_key' IS NOT NULL THEN NULLIF(p_data->>'brand_key', '') END,
        brand_key
      ),
      target_site = COALESCE(
        CASE WHEN p_data ? 'target_site' AND p_data->>'target_site' IS NOT NULL THEN NULLIF(p_data->>'target_site', '') END,
        target_site
      ),
      style = COALESCE(
        CASE WHEN p_data ? 'style' AND p_data->>'style' IS NOT NULL THEN NULLIF(p_data->>'style', '') END,
        style
      ),
      locale = COALESCE(
        CASE WHEN p_data ? 'locale' AND p_data->>'locale' IS NOT NULL THEN NULLIF(p_data->>'locale', '') END,
        locale
      ),
      global_code_after_head_open = COALESCE(
        CASE WHEN p_data ? 'global_code_after_head_open' AND p_data->>'global_code_after_head_open' IS NOT NULL THEN NULLIF(p_data->>'global_code_after_head_open', '') END,
        global_code_after_head_open
      ),
      global_code_after_body_open = COALESCE(
        CASE WHEN p_data ? 'global_code_after_body_open' AND p_data->>'global_code_after_body_open' IS NOT NULL THEN NULLIF(p_data->>'global_code_after_body_open', '') END,
        global_code_after_body_open
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
