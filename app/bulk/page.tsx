import { checkAdminAccess } from "@/app/admin/actions";
import { MassEditor } from "@/components/mass-editor";
import { supabaseClient } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { redirect } from "next/navigation";

type Website = {
  uuid: string;
  domain: string;
  brand: string | null;
  environment_uuid: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  pretty_link: string | null;
  api_key: string | null;
  global_code_after_head_open: string | null;
  global_code_after_body_open: string | null;
};

const getWebsites = async (): Promise<{
  data: Website[];
  error: Error | null;
}> => {
  if (!supabaseClient) {
    return {
      data: [],
      error: new Error("Встановіть SUPABASE_URL і SUPABASE_SERVICE_ROLE_KEY, щоб завантажити дані Supabase."),
    };
  }

  const { data, error } = await supabaseClient
    .from("websites")
    .select("uuid, domain, brand, environment_uuid, status, created_at, updated_at, pretty_link, api_key, global_code_after_head_open, global_code_after_body_open")
    .order("updated_at", { ascending: false });

  return { data: (data ?? []) as Website[], error: error ?? null };
};

export default async function BulkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await checkAdminAccess();
  const { data: websites, error } = await getWebsites();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="container mx-auto py-10 space-y-6">
        <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-amber-300 hover:text-amber-200 transition">
                ← Назад
            </Link>
            <h1 className="text-2xl font-bold">Масовий редактор</h1>
        </div>
        
        {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded text-red-200">
                {error.message}
            </div>
        )}

        <MassEditor websites={websites} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
