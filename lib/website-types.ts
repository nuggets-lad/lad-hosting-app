export type WebsiteDetailRecord = {
  uuid: string;
  domain: string | null;
  brand: string | null;
  environment_uuid: string | null;
  status: string | null;
  payload: string | null;
  ref: string | null;
  pretty_link: string | null;
  created_at: string;
  updated_at: string;
  server_uuid: string | null;
  app_uuid: string | null;
  admin_slug: string | null;
  api_key: string | null;
  admin_user: string | null;
  admin_password: string | null;
  logo: string | null;
  banner: string | null;
  banner_mobile: string | null;
  image_1: string | null;
  image_2: string | null;
  image_3: string | null;
  image_4: string | null;
  favicon: string | null;
  locale: string | null;
  login_button_text: string | null;
  register_button_text: string | null;
  bonus_button_text: string | null;
  publisher: string | null;
  brand_full: string | null;
  brand_key: string | null;
  target_site: string | null;
  style: string | null;
  global_code_after_head_open: string | null;
  global_code_after_body_open: string | null;
};

export type WebsiteHistoryField = {
  key: string;
  value: string;
  changed?: boolean;
};

export type WebsiteHistoryEntry = {
  id: number;
  changed_at: string;
  fields: WebsiteHistoryField[];
  data: Record<string, unknown>;
};

export type WebsiteHistoryRow = {
  id: number;
  data: unknown;
  changed_at: string;
};
