import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./LogoutButton";

export async function Topbar({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .single();

  const profile = data as { full_name: string; avatar_url: string | null } | null;

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {profile?.full_name ?? "User"}
        </span>
        <LogoutButton userId={userId} />
      </div>
    </header>
  );
}
