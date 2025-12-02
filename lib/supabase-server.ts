import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies();
  // @ts-expect-error: @supabase/auth-helpers-nextjs types expect a Promise for cookies in newer Next.js versions, but the implementation requires a synchronous object.
  return createServerComponentClient({ cookies: () => cookieStore });
};
