import { getUsers, checkAdminAccess } from "./actions";
import { redirect } from "next/navigation";
import { UserManagement } from "./user-management";

export default async function AdminPage() {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    redirect("/");
  }

  const users = await getUsers();

  return (
    <div className="min-h-screen bg-slate-950 text-white dark">
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Панель адміністратора</h1>
        <UserManagement initialUsers={users} />
      </div>
    </div>
  );
}
