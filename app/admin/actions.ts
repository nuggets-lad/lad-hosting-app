"use server";

import { ensureClient } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server"; // I need to check if this exists or create it for auth context
import { revalidatePath } from "next/cache";

// We need a way to check the current user's role in server actions
// I'll assume we can get the session using a server-side client

export async function checkAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const adminClient = ensureClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

export async function getUsers() {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const adminClient = ensureClient();
  
  // Get all profiles
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profilesError) throw profilesError;

  return profiles;
}

export async function createUser(formData: FormData) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as "admin" | "editor";

  const adminClient = ensureClient();

  const { data: user, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) throw createError;

  if (user.user) {
    // The trigger might have created the profile with 'editor' role.
    // We need to update it to the selected role.
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ role })
      .eq("id", user.user.id);

    if (updateError) throw updateError;
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const adminClient = ensureClient();

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) throw error;

  revalidatePath("/admin");
  return { success: true };
}

export async function updateUserPassword(formData: FormData) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const userId = formData.get("userId") as string;
  const password = formData.get("password") as string;

  const adminClient = ensureClient();

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) throw error;

  revalidatePath("/admin");
  return { success: true };
}

export async function updateUserRole(formData: FormData) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const userId = formData.get("userId") as string;
  const role = formData.get("role") as "admin" | "editor";

  const adminClient = ensureClient();

  const { error } = await adminClient
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) throw error;

  revalidatePath("/admin");
  return { success: true };
}
