"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createUser, deleteUser, updateUserPassword, updateUserRole } from "./actions";
import { Loader2, Plus, Trash2, Key, Shield, UserCog } from "lucide-react";

type Profile = {
  id: string;
  email: string;
  role: "admin" | "editor";
  created_at: string;
};

export function UserManagement({ initialUsers }: { initialUsers: Profile[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>(initialUsers);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createUser(formData);
      setIsAddDialogOpen(false);
      // In a real app we might re-fetch or rely on router refresh, 
      // but for now let's just reload the page to get fresh data
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Не вдалося створити користувача");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Ви впевнені, що хочете видалити цього користувача?")) return;
    setIsLoading(true);
    try {
      await deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (error) {
      console.error(error);
      alert("Не вдалося видалити користувача");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("userId", selectedUser.id);
    try {
      await updateUserPassword(formData);
      setIsPasswordDialogOpen(false);
      alert("Пароль успішно оновлено");
    } catch (error) {
      console.error(error);
      alert("Не вдалося оновити пароль");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("userId", selectedUser.id);
    try {
      await updateUserRole(formData);
      setIsRoleDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Не вдалося оновити роль");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Користувачі</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Додати користувача
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Додати нового користувача</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Роль</Label>
                <Select name="role" defaultValue="editor">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Редактор</SelectItem>
                    <SelectItem value="admin">Адміністратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Створити користувача
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Роль</th>
              <th className="px-6 py-3 font-medium">Створено</th>
              <th className="px-6 py-3 font-medium text-right">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {user.role === "admin" ? "Адміністратор" : "Редактор"}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500" suppressHydrationWarning>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={() => {
                      setSelectedUser(user);
                      setIsRoleDialogOpen(true);
                    }}
                    title="Змінити роль"
                  >
                    <Shield className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={() => {
                      setSelectedUser(user);
                      setIsPasswordDialogOpen(true);
                    }}
                    title="Змінити пароль"
                  >
                    <Key className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 h-8 w-8"
                    onClick={() => handleDeleteUser(user.id)}
                    title="Видалити користувача"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Змінити пароль для {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Новий пароль</Label>
              <Input id="new-password" name="password" type="password" required />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Оновити пароль
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Змінити роль для {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateRole} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-role">Роль</Label>
              <Select name="role" defaultValue={selectedUser?.role || "editor"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Редактор</SelectItem>
                  <SelectItem value="admin">Адміністратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Оновити роль
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
