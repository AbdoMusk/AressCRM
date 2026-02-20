import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("modules").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok" });
  } catch (e: any) {
    return NextResponse.json({ status: "error", message: e.message }, { status: 500 });
  }
}
