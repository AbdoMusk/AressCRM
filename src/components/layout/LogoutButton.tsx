"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/modules/auth/actions/auth.actions";

export function LogoutButton({ userId }: { userId: string }) {
  const router = useRouter();

  async function handleLogout() {
    await logoutAction(userId);
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      title="Sign Out"
    >
      <LogOut size={18} />
    </button>
  );
}
